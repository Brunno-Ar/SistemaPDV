import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { TipoMovimentacaoCaixa, MetodoPagamento, Caixa } from "@prisma/client";

export const dynamic = "force-dynamic";

// Helper function to calculate expected values
async function calcularValoresEsperados(userId: string, caixaAberto: Partial<Caixa>) {
  // 1. Fetch Sales aggregated by payment method since opening
  const vendas = await prisma.sale.groupBy({
    by: ["metodoPagamento"],
    where: {
      userId: userId,
      dataHora: { gte: caixaAberto.dataAbertura },
    },
    _sum: {
      valorTotal: true,
    },
  });

  const getTotal = (metodo: MetodoPagamento) => {
    const found = vendas.find((v) => v.metodoPagamento === metodo);
    return Number(found?._sum.valorTotal || 0);
  };

  const vendasDinheiro = getTotal("dinheiro");
  const vendasPix = getTotal("pix");
  const vendasCredito = getTotal("credito");
  const vendasDebito = getTotal("debito");
  const vendasCartao = vendasCredito + vendasDebito;

  // 2. Calculate Movements (Sangrias and Suprimentos)
  const todasMovimentacoes = await prisma.movimentacaoCaixa.findMany({
    where: { caixaId: caixaAberto.id },
  });

  let totalSangrias = 0;
  let totalSuprimentos = 0;

  todasMovimentacoes.forEach((mov) => {
    const valor = Number(mov.valor || 0);
    if (mov.tipo === TipoMovimentacaoCaixa.SANGRIA) {
      totalSangrias += valor;
    } else if (mov.tipo === TipoMovimentacaoCaixa.SUPRIMENTO) {
      totalSuprimentos += valor;
    }
  });

  // 3. Calculate Theoretical Balances
  const saldoInicial = Number(caixaAberto.saldoInicial);

  // Expected Cash = Initial + Supplies - Bleeds + Sales(Cash)
  const saldoTeoricoDinheiro =
    saldoInicial + vendasDinheiro + totalSuprimentos - totalSangrias;

  // Expected Machine (Pix + Card)
  const saldoTeoricoMaquininha = vendasPix + vendasCartao;

  // Total Theoretical Drawer
  const totalTeoricoSistema = saldoTeoricoDinheiro + saldoTeoricoMaquininha;

  return {
    vendasDinheiro,
    vendasPix,
    vendasCartao,
    totalSangrias,
    totalSuprimentos,
    saldoTeoricoDinheiro,
    saldoTeoricoMaquininha,
    totalTeoricoSistema,
  };
}

// GET - Buscar caixa aberto do usuário e status
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const caixaAberto = await prisma.caixa.findFirst({
      where: {
        usuarioId: session.user.id,
        status: "ABERTO",
      },
      include: {
        movimentacoes: {
          orderBy: {
            dataHora: "desc",
          },
        },
      },
      orderBy: {
        dataAbertura: "desc",
      },
    });

    if (caixaAberto) {
      // Buscar vendas em dinheiro realizadas após a abertura do caixa
      const vendas = await prisma.sale.findMany({
        where: {
          userId: session.user.id,
          metodoPagamento: "dinheiro",
          dataHora: {
            gte: caixaAberto.dataAbertura,
          },
        },
        orderBy: {
          dataHora: "desc",
        },
      });

      // Unificar movimentações e vendas
      const movimentosUnificados = [
        ...caixaAberto.movimentacoes.map((m) => ({
          id: m.id,
          tipo: m.tipo,
          valor: Number(m.valor),
          descricao: m.descricao,
          dataHora: m.dataHora,
        })),
        ...vendas.map((v) => ({
          id: v.id,
          tipo: "VENDA",
          valor: Number(v.valorTotal),
          descricao: v.troco
            ? `Venda (Troco: R$ ${Number(v.troco).toFixed(2)})`
            : "Venda",
          dataHora: v.dataHora,
        })),
      ].sort(
        (a, b) =>
          new Date(b.dataHora).getTime() - new Date(a.dataHora).getTime()
      );

      return NextResponse.json({
        caixaAberto: {
          ...caixaAberto,
          movimentacoes: movimentosUnificados,
        },
      });
    }

    return NextResponse.json({ caixaAberto });
  } catch (error) {
    console.error("Erro ao buscar caixa:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

// POST - Ações do Caixa
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const body = await request.json();
    const {
      action,
      saldoInicial,
      valor,
      descricao,
      metodoPagamento,
      // Novos campos de fechamento
      valorInformadoDinheiro,
      valorInformadoMaquininha, // Novo campo
      justificativa,
    } = body;

    // === ABRIR CAIXA ===
    if (action === "abrir") {
      console.log(
        "Tentando abrir caixa. User:",
        session.user.id,
        "Empresa:",
        session.user.empresaId
      );

      const caixaExistente = await prisma.caixa.findFirst({
        where: {
          usuarioId: session.user.id,
          status: "ABERTO",
        },
      });

      if (caixaExistente) {
        return NextResponse.json(
          { error: "Você já possui um caixa aberto! Recarregue a página." },
          { status: 400 }
        );
      }

      const saldoNum = Number(saldoInicial);
      if (
        saldoInicial === undefined ||
        saldoInicial === null ||
        isNaN(saldoNum) ||
        saldoNum < 0
      ) {
        return NextResponse.json(
          { error: "Saldo inicial inválido. Insira um valor positivo." },
          { status: 400 }
        );
      }

      if (!session.user.empresaId) {
        return NextResponse.json(
          { error: "Erro de permissão: Usuário não vinculado a uma empresa." },
          { status: 400 }
        );
      }

      const result = await prisma.$transaction(async (tx) => {
        const novoCaixa = await tx.caixa.create({
          data: {
            usuarioId: session.user.id,
            empresaId: session.user.empresaId!,
            saldoInicial: Number(saldoInicial),
            status: "ABERTO",
          },
        });

        await tx.movimentacaoCaixa.create({
          data: {
            caixaId: novoCaixa.id,
            usuarioId: session.user.id,
            tipo: TipoMovimentacaoCaixa.ABERTURA,
            valor: Number(saldoInicial),
            descricao: "Abertura de Caixa",
          },
        });

        return novoCaixa;
      });

      return NextResponse.json({
        success: true,
        message: "Caixa aberto com sucesso!",
        caixa: result,
      });
    }

    // Para ações que exigem caixa aberto
    const caixaAberto = await prisma.caixa.findFirst({
      where: {
        usuarioId: session.user.id,
        status: "ABERTO",
      },
    });

    if (!caixaAberto) {
      return NextResponse.json(
        { error: "Você não possui um caixa aberto!" },
        { status: 400 }
      );
    }

    // === SANGRIA / SUPRIMENTO ===
    if (action === "sangria" || action === "suprimento") {
      const valorNum = Number(valor);
      if (!valor || isNaN(valorNum) || valorNum <= 0) {
        return NextResponse.json(
          { error: "Valor inválido. Insira um valor maior que zero." },
          { status: 400 }
        );
      }

      const tipo =
        action === "sangria"
          ? TipoMovimentacaoCaixa.SANGRIA
          : TipoMovimentacaoCaixa.SUPRIMENTO;

      const mov = await prisma.movimentacaoCaixa.create({
        data: {
          caixaId: caixaAberto.id,
          usuarioId: session.user.id,
          tipo: tipo,
          valor: Number(valor),
          descricao: descricao || "",
          metodoPagamento: metodoPagamento as MetodoPagamento,
        },
      });

      return NextResponse.json({
        success: true,
        message: `${action === "sangria" ? "Sangria" : "Suprimento"
          } realizado com sucesso!`,
        movimentacao: mov,
      });
    }

    // === CONFERIR / FECHAR (LÓGICA UNIFICADA) ===
    if (action === "conferir" || action === "fechar") {
      // 1. Get Inputs (Informed)
      const infDinheiro = Number(valorInformadoDinheiro ?? 0);
      const infMaquininha = Number(valorInformadoMaquininha ?? 0);

      // 2. Get Theoretical (System)
      const dados = await calcularValoresEsperados(
        session.user.id,
        caixaAberto
      );

      // 3. Calculate Divergence (General)
      const totalInformado = infDinheiro + infMaquininha;
      const totalSistema = dados.totalTeoricoSistema;
      const divergenciaGeral = totalInformado - totalSistema;

      // Check if there is a significant divergence (> 1 cent)
      const temDivergencia = Math.abs(divergenciaGeral) > 0.009;

      // 4. Internal Audit (Cash Only)
      const diffDinheiro = infDinheiro - dados.saldoTeoricoDinheiro;
      const diffMaquininha = infMaquininha - dados.saldoTeoricoMaquininha;

      const detalhes = {
        esperado: {
          dinheiro: dados.saldoTeoricoDinheiro,
          maquininha: dados.saldoTeoricoMaquininha,
          total: totalSistema,
        },
        informado: {
          dinheiro: infDinheiro,
          maquininha: infMaquininha,
          total: totalInformado,
        },
        diferenca: {
          dinheiro: diffDinheiro,
          maquininha: diffMaquininha,
          total: divergenciaGeral,
        },
      };

      // If just checking, return details
      if (action === "conferir") {
        return NextResponse.json({
          success: true,
          temDivergencia,
          detalhes,
        });
      }

      // === ACTION: FECHAR ===

      // Backend Validation: Divergence requires Justification
      if (temDivergencia && (!justificativa || justificativa.trim() === "")) {
        return NextResponse.json(
          {
            error:
              "Justificativa é obrigatória quando há divergência de valores.",
          },
          { status: 400 }
        );
      }

      // Update Caixa
      const caixaFechado = await prisma.caixa.update({
        where: { id: caixaAberto.id },
        data: {
          saldoFinal: totalInformado,
          valorInformadoDinheiro: infDinheiro,
          valorInformadoMaquininha: infMaquininha,
          // Deprecated fields set to 0 to avoid null issues if they are required in some legacy view,
          // or we can leave them null if schema allows. Schema allows null.
          valorInformadoPix: 0,
          valorInformadoCartao: 0,

          justificativa: justificativa,
          quebraDeCaixa: divergenciaGeral, // Total monetário da divergência (pode ser positivo ou negativo)
          divergenciaDinheiro: diffDinheiro, // Internal Audit Log

          status: "FECHADO",
          dataFechamento: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        message: temDivergencia
          ? "Caixa fechado com divergência."
          : "Caixa fechado com sucesso!",
        caixa: caixaFechado,
        divergencia: temDivergencia,
        detalhes: {
          diferencaTotal: divergenciaGeral,
        },
      });
    }

    return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
  } catch (error) {
    console.error("Erro na operação de caixa:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
