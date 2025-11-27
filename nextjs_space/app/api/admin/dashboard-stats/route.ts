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

    // Vendas hoje
    const vendasHoje = await prisma.sale.count({
      where: {
        empresaId,
        dataHora: {
          gte: hoje,
        },
      },
    });

    // Vendas esta semana
    const vendasSemana = await prisma.sale.count({
      where: {
        empresaId,
        dataHora: {
          gte: inicioSemana,
        },
      },
    });

    // Receita hoje (total de vendas)
    const vendasHojeData = await prisma.sale.findMany({
      where: {
        empresaId,
        dataHora: {
          gte: hoje,
        },
      },
      select: {
        valorTotal: true,
      },
    });

    const receitaHoje = vendasHojeData.reduce(
      (acc: number, venda: any) => acc + Number(venda.valorTotal),
      0
    );

    // Receita esta semana
    const vendasSemanaData = await prisma.sale.findMany({
      where: {
        empresaId,
        dataHora: {
          gte: inicioSemana,
        },
      },
      select: {
        valorTotal: true,
      },
    });

    const receitaSemana = vendasSemanaData.reduce(
      (acc: number, venda: any) => acc + Number(venda.valorTotal),
      0
    );

    // Calcular lucro hoje (valor de venda - custo de compra)
    const vendasHojeComItens = await prisma.sale.findMany({
      where: {
        empresaId,
        dataHora: {
          gte: hoje,
        },
      },
      include: {
        saleItems: {
          include: {
            product: {
              select: {
                precoCompra: true,
              },
            },
          },
        },
      },
    });

    let lucroHoje = 0;
    for (const venda of vendasHojeComItens) {
      for (const item of venda.saleItems) {
        const custoItem =
          Number(item.product?.precoCompra || 0) * item.quantidade;
        const valorItem = Number(item.subtotal);
        lucroHoje += valorItem - custoItem;
      }
    }

    // Calcular lucro esta semana
    const vendasSemanaComItens = await prisma.sale.findMany({
      where: {
        empresaId,
        dataHora: {
          gte: inicioSemana,
        },
      },
      include: {
        saleItems: {
          include: {
            product: {
              select: {
                precoCompra: true,
              },
            },
          },
        },
      },
    });

    let lucroSemana = 0;
    for (const venda of vendasSemanaComItens) {
      for (const item of venda.saleItems) {
        const custoItem =
          Number(item.product?.precoCompra || 0) * item.quantidade;
        const valorItem = Number(item.subtotal);
        lucroSemana += valorItem - custoItem;
      }
    }

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
