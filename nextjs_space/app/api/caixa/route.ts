import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { TipoMovimentacaoCaixa, MetodoPagamento } from "@prisma/client";

export const dynamic = "force-dynamic";

// Helper function to calculate expected values
async function calcularValoresEsperados(userId: string, caixaAberto: any) {
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

  // Money in Drawer = Initial + Sales(Money) + Supply - Bleed
  const saldoTeoricoDinheiro =
    saldoInicial + vendasDinheiro + totalSuprimentos - totalSangrias;

  // Digital Balances (just Sales)
  const saldoTeoricoPix = vendasPix;
  const saldoTeoricoCartao = vendasCartao;

  return {
    vendasDinheiro,
    vendasPix,
    vendasCartao,
    totalSangrias,
    totalSuprimentos,
    saldoTeoricoDinheiro,
    saldoTeoricoPix,
    saldoTeoricoCartao,
    totalVendas: vendasDinheiro + vendasPix + vendasCartao,
  };
}

// GET - Buscar caixa aberto do usuário e status
export async function GET(request: NextRequest) {
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
      // Novos campos de fechamento
      valorInformadoDinheiro,
      valorInformadoPix,
      valorInformadoCartao,
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
        },
      });

      return NextResponse.json({
        success: true,
        message: `${
          action === "sangria" ? "Sangria" : "Suprimento"
        } realizado com sucesso!`,
        movimentacao: mov,
      });
    }

    // === CONFERIR (NOVA AÇÃO) ===
    if (action === "conferir") {
      // Validate inputs (allow 0)
      const infDinheiro = Number(valorInformadoDinheiro ?? 0);
      const infPix = Number(valorInformadoPix ?? 0);
      const infCartao = Number(valorInformadoCartao ?? 0);

      const dados = await calcularValoresEsperados(
        session.user.id,
        caixaAberto
      );

      const difDinheiro = infDinheiro - dados.saldoTeoricoDinheiro;
      const difPix = infPix - dados.saldoTeoricoPix;
      const difCartao = infCartao - dados.saldoTeoricoCartao;

      const totalDivergencia = difDinheiro + difPix + difCartao;
      const temDivergencia =
        Math.abs(totalDivergencia) > 0.009 ||
        Math.abs(difDinheiro) > 0.009 ||
        Math.abs(difPix) > 0.009 ||
        Math.abs(difCartao) > 0.009;

      return NextResponse.json({
        success: true,
        temDivergencia,
        detalhes: {
          esperado: {
            dinheiro: dados.saldoTeoricoDinheiro,
            pix: dados.saldoTeoricoPix,
            cartao: dados.saldoTeoricoCartao,
          },
          informado: {
            dinheiro: infDinheiro,
            pix: infPix,
            cartao: infCartao,
          },
          diferenca: {
            dinheiro: difDinheiro,
            pix: difPix,
            cartao: difCartao,
            total: totalDivergencia,
          },
        },
      });
    }

    // === FECHAR CAIXA ===
    if (action === "fechar") {
      // Inputs
      const infDinheiro = Number(valorInformadoDinheiro ?? 0);
      const infPix = Number(valorInformadoPix ?? 0);
      const infCartao = Number(valorInformadoCartao ?? 0);

      const dados = await calcularValoresEsperados(
        session.user.id,
        caixaAberto
      );

      const difDinheiro = infDinheiro - dados.saldoTeoricoDinheiro;
      const difPix = infPix - dados.saldoTeoricoPix;
      const difCartao = infCartao - dados.saldoTeoricoCartao;

      const totalDivergencia = difDinheiro + difPix + difCartao;
      const temDivergencia =
        Math.abs(totalDivergencia) > 0.009 ||
        Math.abs(difDinheiro) > 0.009 ||
        Math.abs(difPix) > 0.009 ||
        Math.abs(difCartao) > 0.009;

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

      // Total Final (Sum of informed values)
      const saldoFinal = infDinheiro + infPix + infCartao;

      // Update Caixa
      const caixaFechado = await prisma.caixa.update({
        where: { id: caixaAberto.id },
        data: {
          saldoFinal: saldoFinal,
          valorInformadoDinheiro: infDinheiro,
          valorInformadoPix: infPix,
          valorInformadoCartao: infCartao,
          justificativa: justificativa,
          quebraDeCaixa: totalDivergencia, // Total monetário da divergência
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
          diferencaTotal: totalDivergencia,
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
