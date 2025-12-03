import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Buscar vendas do usuário hoje
    const vendasHoje = await prisma.sale.aggregate({
      where: {
        userId: session.user.id,
        dataHora: {
          gte: today,
        },
      },
      _sum: {
        valorTotal: true,
      },
      _count: true,
    });

    // Buscar total de itens vendidos hoje
    const itensVendidos = await prisma.saleItem.aggregate({
      where: {
        sale: {
          userId: session.user.id,
          dataHora: {
            gte: today,
          },
        },
      },
      _sum: {
        quantidade: true,
      },
    });

    const valorTotalHoje = Number(vendasHoje._sum.valorTotal || 0);
    const totalItens = itensVendidos._sum.quantidade || 0;
    const totalTransacoes = vendasHoje._count;

    // Meta fictícia de R$ 1000,00
    const meta = 1000;
    const progresso = Math.min((valorTotalHoje / meta) * 100, 100);

    return NextResponse.json({
      valorTotalHoje,
      totalItens,
      totalTransacoes,
      meta,
      progresso: progresso.toFixed(1),
    });
  } catch (error) {
    console.error("Erro ao buscar gamification:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
