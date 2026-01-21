import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/caixas
 * Retorna todos os caixas abertos da empresa para visualização do admin/gerente
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    // Apenas admin, gerente ou master podem ver todos os caixas
    if (
      session.user.role !== "admin" &&
      session.user.role !== "gerente" &&
      session.user.role !== "master"
    ) {
      return NextResponse.json(
        { error: "Acesso negado. Apenas administradores." },
        { status: 403 },
      );
    }

    const empresaId = session.user.empresaId;

    if (!empresaId) {
      return NextResponse.json(
        { error: "Empresa não identificada" },
        { status: 400 },
      );
    }

    // Buscar todos os caixas abertos da empresa
    const caixasAbertos = await prisma.caixa.findMany({
      where: {
        empresaId,
        status: "ABERTO",
      },
      include: {
        usuario: {
          select: {
            id: true,
            name: true,
            nome: true,
            role: true,
          },
        },
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

    // Buscar vendas de cada caixa para calcular totais
    const caixasComVendas = await Promise.all(
      caixasAbertos.map(async (caixa) => {
        // Vendas do período para identificar pagamentos e troco
        const vendasCaixa = await prisma.sale.findMany({
          where: {
            userId: caixa.usuarioId,
            dataHora: { gte: caixa.dataAbertura },
          },
          include: {
            payments: true,
          },
        });

        // Calcular totais por método de pagamento considerando SalePayment
        let vendasDinheiro = 0;
        let vendasPix = 0;
        let vendasCredito = 0;
        let vendasDebito = 0;

        for (const venda of vendasCaixa) {
          const trocoVenda = Number(venda.troco) || 0;

          if (venda.payments && venda.payments.length > 0) {
            let dinheiroRecebidoNestaVenda = 0;
            for (const p of venda.payments) {
              const valor = Number(p.amount) || 0;
              switch (p.method) {
                case "dinheiro":
                  dinheiroRecebidoNestaVenda += valor;
                  break;
                case "pix":
                  vendasPix += valor;
                  break;
                case "credito":
                  vendasCredito += valor;
                  break;
                case "debito":
                  vendasDebito += valor;
                  break;
              }
            }
            vendasDinheiro += Math.max(
              0,
              dinheiroRecebidoNestaVenda - trocoVenda,
            );
          } else {
            // Fallback para formato antigo
            const valorTotal = Number(venda.valorTotal) || 0;
            switch (venda.metodoPagamento) {
              case "dinheiro":
                vendasDinheiro += valorTotal;
                break;
              case "pix":
                vendasPix += valorTotal;
                break;
              case "credito":
                vendasCredito += valorTotal;
                break;
              case "debito":
                vendasDebito += valorTotal;
                break;
            }
          }
        }

        const vendasCartao = vendasCredito + vendasDebito;
        const totalVendas = vendasDinheiro + vendasPix + vendasCartao;

        // Calcular movimentações SEPARADAS por método de pagamento
        const sangriasDinheiro = caixa.movimentacoes
          .filter(
            (m) =>
              m.tipo === "SANGRIA" &&
              (!m.metodoPagamento || m.metodoPagamento === "dinheiro"),
          )
          .reduce((acc, m) => acc + Number(m.valor), 0);

        const sangriasMaquininha = caixa.movimentacoes
          .filter(
            (m) =>
              m.tipo === "SANGRIA" &&
              m.metodoPagamento &&
              m.metodoPagamento !== "dinheiro",
          )
          .reduce((acc, m) => acc + Number(m.valor), 0);

        const suprimentosDinheiro = caixa.movimentacoes
          .filter(
            (m) =>
              m.tipo === "SUPRIMENTO" &&
              (!m.metodoPagamento || m.metodoPagamento === "dinheiro"),
          )
          .reduce((acc, m) => acc + Number(m.valor), 0);

        const suprimentosMaquininha = caixa.movimentacoes
          .filter(
            (m) =>
              m.tipo === "SUPRIMENTO" &&
              m.metodoPagamento &&
              m.metodoPagamento !== "dinheiro",
          )
          .reduce((acc, m) => acc + Number(m.valor), 0);

        const sangrias = sangriasDinheiro + sangriasMaquininha;
        const suprimentos = suprimentosDinheiro + suprimentosMaquininha;

        // CALCULAR DINHEIRO EM CAIXA
        // Saldo Inicial + Vendas Dinheiro + Suprimentos Dinheiro - Sangrias Dinheiro
        const dinheiroCaixa =
          Number(caixa.saldoInicial) +
          vendasDinheiro +
          suprimentosDinheiro -
          sangriasDinheiro;

        return {
          id: caixa.id,
          funcionario:
            caixa.usuario.nome || caixa.usuario.name || "Funcionário",
          funcionarioId: caixa.usuarioId,
          funcionarioRole: caixa.usuario.role, // Role do funcionário para filtrar admin/gerente
          dataAbertura: caixa.dataAbertura,
          saldoInicial: Number(caixa.saldoInicial),
          dinheiroCaixa, // NOVO: saldo atual de dinheiro
          vendas: {
            total: totalVendas,
            dinheiro: vendasDinheiro,
            pix: vendasPix,
            cartao: vendasCartao,
            quantidade: vendasCaixa.length,
          },
          sangrias,
          suprimentos,
          // Movimentações formatadas para exibição
          movimentacoes: [
            ...caixa.movimentacoes.map((m) => ({
              id: m.id,
              tipo: m.tipo as string,
              valor: Number(m.valor),
              descricao: m.descricao,
              metodoPagamento: m.metodoPagamento,
              dataHora: m.dataHora,
            })),
            ...vendasCaixa.map((v) => ({
              id: v.id,
              tipo: "VENDA",
              valor: Number(v.valorTotal),
              descricao: v.troco
                ? `Venda (Troco: R$ ${Number(v.troco).toFixed(2)})`
                : "Venda",
              metodoPagamento: v.metodoPagamento,
              dataHora: v.dataHora,
            })),
          ].sort(
            (a, b) =>
              new Date(b.dataHora).getTime() - new Date(a.dataHora).getTime(),
          ),
        };
      }),
    );

    // Resumo geral
    const resumo = {
      totalCaixasAbertos: caixasAbertos.length,
      totalVendasDia: caixasComVendas.reduce(
        (acc, c) => acc + c.vendas.total,
        0,
      ),
      totalSangrias: caixasComVendas.reduce((acc, c) => acc + c.sangrias, 0),
      totalSuprimentos: caixasComVendas.reduce(
        (acc, c) => acc + c.suprimentos,
        0,
      ),
      totalDinheiroCaixas: caixasComVendas.reduce(
        (acc, c) => acc + c.dinheiroCaixa,
        0,
      ),
    };

    return NextResponse.json({
      caixas: caixasComVendas,
      resumo,
    });
  } catch (error) {
    console.error("Erro ao buscar caixas:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
