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
      (session.user.role !== "admin" && session.user.role !== "master" && session.user.role !== "gerente")
    ) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const empresaId = session.user.empresaId;
    if (!empresaId) {
      return NextResponse.json(
        { error: "Empresa não identificada" },
        { status: 400 }
      );
    }

    const hoje = new Date();
    const trintaDias = new Date();
    trintaDias.setDate(hoje.getDate() + 30);

    const lotesProximosVencimento = await prisma.lote.findMany({
      where: {
        produto: {
          empresaId,
        },
        dataValidade: {
          gte: hoje,
          lte: trintaDias,
        },
        quantidade: {
          gt: 0, // Apenas lotes com estoque
        },
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
    });

    return NextResponse.json(lotesProximosVencimento);
  } catch (error) {
    console.error("Erro ao buscar lotes próximos do vencimento:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
