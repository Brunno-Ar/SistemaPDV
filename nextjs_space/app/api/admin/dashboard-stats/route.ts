import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (
      !session?.user ||
      (session.user.role !== "admin" &&
        session.user.role !== "master" &&
        session.user.role !== "gerente")
    ) {
      return NextResponse.json(
        { error: "Acesso negado. Apenas administradores e gerentes." },
        { status: 403 }
      );
    }

    const empresaId = session.user.empresaId;

    if (!empresaId) {
      return NextResponse.json(
        { error: "Empresa não identificada" },
        { status: 400 }
      );
    }

    // Data de hoje às 00:00:00
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    // Data de início da semana (domingo)
    const inicioSemana = new Date(hoje);
    inicioSemana.setDate(hoje.getDate() - hoje.getDay());

    // Total de produtos
    const totalProdutos = await prisma.product.count({
      where: { empresaId },
    });

    // Produtos com estoque baixo (Count)
    const produtosEstoqueBaixo = await prisma.product.count({
      where: {
        empresaId,
        estoqueAtual: {
          lte: prisma.product.fields.estoqueMinimo,
        },
      },
    });

    // Produtos com estoque baixo para o Dashboard (TODOS)
    const topLowStock = await prisma.product.findMany({
      where: {
        empresaId,
        estoqueMinimo: { gt: 0 }, // Ignora se minimo for 0
        estoqueAtual: {
          lt: prisma.product.fields.estoqueMinimo, // Menor que o mínimo
        },
      },
      select: {
        id: true,
        nome: true,
        sku: true,
        estoqueAtual: true,
        estoqueMinimo: true,
        precoVenda: true,
        imagemUrl: true,
      },
    });

    // Lotes com vencimento próximo (30 dias)
    const dataLimite = new Date();
    dataLimite.setDate(dataLimite.getDate() + 30);

    const lotesVencimentoProximo = await prisma.lote.findMany({
      where: {
        produto: { empresaId },
        dataValidade: {
          lte: dataLimite,
          gte: new Date(), // Apenas futuros ou hoje (vencidos já foram) ou incluir vencidos? O admin mostra vencidos?
          // O admin mostra "Vencimento Próximo". Vamos pegar os próximos 30 dias.
        },
        quantidade: { gt: 0 },
      },
      include: {
        produto: {
          select: {
            nome: true,
            sku: true,
          },
        },
      },
      orderBy: {
        dataValidade: "asc",
      },
      take: 10,
    });

    // Ordenar por criticidade (percentual de estoque restante) e formatar
    // Menor % = Mais crítico
    const topLowStockSorted = topLowStock
      .map((p) => ({
        id: p.id,
        nome: p.nome,
        sku: p.sku,
        estoque_atual: p.estoqueAtual,
        estoque_minimo: p.estoqueMinimo,
        deficit: p.estoqueMinimo - p.estoqueAtual,
        preco: Number(p.precoVenda),
        imagem_url: p.imagemUrl,
        criticidade: p.estoqueAtual / p.estoqueMinimo, // Usado apenas para ordenação interna
      }))
      .sort((a, b) => a.criticidade - b.criticidade);
    // .slice(0, 5); // Removido limite para mostrar todos

    // Agregação otimizada para Hoje
    const statsHoje = await prisma.sale.aggregate({
      where: {
        empresaId,
        dataHora: { gte: hoje },
      },
      _count: { id: true },
      _sum: { valorTotal: true },
    });

    const vendasHoje = statsHoje._count.id;
    const receitaHoje = Number(statsHoje._sum.valorTotal || 0);

    // Agregação otimizada para Semana
    const statsSemana = await prisma.sale.aggregate({
      where: {
        empresaId,
        dataHora: { gte: inicioSemana },
      },
      _count: { id: true },
      _sum: { valorTotal: true },
    });

    const vendasSemana = statsSemana._count.id;
    const receitaSemana = Number(statsSemana._sum.valorTotal || 0);

    // Otimização do cálculo de Lucro (usando SaleItem diretamente)
    // Busca apenas campos numéricos necessários, sem joins pesados
    const itemsHoje = await prisma.saleItem.findMany({
      where: {
        sale: {
          empresaId,
          dataHora: { gte: hoje },
        },
      },
      select: {
        subtotal: true,
        quantidade: true,
        custoUnitario: true,
      },
    });

    const lucroHoje = itemsHoje.reduce((acc, item) => {
      const receitaItem = Number(item.subtotal);
      const custoItem = Number(item.custoUnitario) * item.quantidade;
      return acc + (receitaItem - custoItem);
    }, 0);

    const itemsSemana = await prisma.saleItem.findMany({
      where: {
        sale: {
          empresaId,
          dataHora: { gte: inicioSemana },
        },
      },
      select: {
        subtotal: true,
        quantidade: true,
        custoUnitario: true,
      },
    });

    const lucroSemana = itemsSemana.reduce((acc, item) => {
      const receitaItem = Number(item.subtotal);
      const custoItem = Number(item.custoUnitario) * item.quantidade;
      return acc + (receitaItem - custoItem);
    }, 0);

    // Cálculo de dias para vencimento
    let diasParaVencimento = null;
    if (session.user.vencimentoPlano) {
      const dataVencimento = new Date(session.user.vencimentoPlano);
      const diffTime = dataVencimento.getTime() - hoje.getTime();
      diasParaVencimento = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    return NextResponse.json({
      stats: {
        totalProdutos,
        produtosEstoqueBaixo,
        vendasHoje,
        vendasSemana,
        receitaHoje,
        receitaSemana,
        lucroHoje,
        lucroSemana,
        topLowStock: topLowStockSorted,
        diasParaVencimento,
      },
      produtosEstoqueBaixo: topLowStockSorted, // Legacy support for direct access
      lotesVencimentoProximo: lotesVencimentoProximo,
    });
  } catch (error) {
    console.error("Erro ao buscar estatísticas do dashboard:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
