import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET: Detalhes do funcionário
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (
      !session?.user ||
      (session.user.role !== "admin" && session.user.role !== "master")
    ) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const funcionarioId = params.id;

    const funcionario = await prisma.user.findUnique({
      where: { id: funcionarioId },
      select: {
        id: true,
        nome: true,
        email: true,
        role: true,
        createdAt: true,
        metaMensal: true,
        _count: {
          select: {
            sales: true,
            caixas: true,
          },
        },
        caixas: {
          take: 30,
          orderBy: { dataAbertura: "desc" },
          include: {
            movimentacoes: true,
          },
        },
      },
    });

    if (!funcionario) {
      return NextResponse.json(
        { error: "Funcionário não encontrado" },
        { status: 404 }
      );
    }

    // Calcular total de vendas do mês atual
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const vendasMes = await prisma.sale.aggregate({
      where: {
        userId: funcionarioId,
        createdAt: {
          gte: firstDayOfMonth,
        },
      },
      _sum: {
        valorTotal: true,
      },
    });

    return NextResponse.json({
      ...funcionario,
      totalVendasMes: vendasMes._sum.valorTotal || 0,
    });
  } catch (error) {
    console.error("Erro ao buscar detalhes do funcionário:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

// PUT: Atualizar meta mensal
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (
      !session?.user ||
      (session.user.role !== "admin" && session.user.role !== "master")
    ) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const { metaMensal } = await request.json();

    const funcionario = await prisma.user.update({
      where: { id: params.id },
      data: {
        metaMensal: Number(metaMensal),
      },
    });

    return NextResponse.json(funcionario);
  } catch (error) {
    console.error("Erro ao atualizar meta:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
