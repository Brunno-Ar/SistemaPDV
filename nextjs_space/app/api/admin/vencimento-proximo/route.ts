import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";

export const dynamic = "force-dynamic";

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (
      !session?.user ||
      (session.user.role !== "admin" && session.user.role !== "master")
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
