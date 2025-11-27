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
      (session.user.role !== "admin" && session.user.role !== "master")
    ) {
      return NextResponse.json(
        { error: "Acesso negado. Apenas administradores podem acessar." },
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

    // Produtos com estoque baixo
    const produtosEstoqueBaixo = await prisma.product.count({
      where: {
        empresaId,
        estoqueAtual: {
          lte: prisma.product.fields.estoqueMinimo,
        },
      },
    });

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

    return NextResponse.json({
      totalProdutos,
      produtosEstoqueBaixo,
      vendasHoje,
      vendasSemana,
      receitaHoje,
      receitaSemana,
      lucroHoje,
      lucroSemana,
    });
  } catch (error) {
    console.error("Erro ao buscar estatísticas do dashboard:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
