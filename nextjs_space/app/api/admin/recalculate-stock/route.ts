import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/recalculate-stock
 * Recalcula o estoqueAtual de todos os produtos com base na soma dos lotes.
 * Útil para corrigir inconsistências (Self-Healing).
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "admin" && session.user.role !== "master" && session.user.role !== "gerente") {
      return NextResponse.json(
        { error: "Acesso negado. Apenas administradores." },
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

    // 1. Buscar todos os produtos da empresa com seus lotes
    const products = await prisma.product.findMany({
      where: { empresaId },
      include: {
        lotes: true,
      },
    });

    let updatedCount = 0;
    const updates = [];

    // 2. Calcular e comparar
    for (const product of products) {
      // Soma apenas lotes ativos (quantidade > 0) ou todos?
      // A regra é: estoqueAtual = soma(lotes.quantidade)
      // Lotes com quantidade negativa não deveriam existir, mas se existirem, entram na conta?
      // Sim, matemática simples.

      const realStock = product.lotes.reduce(
        (sum, lote) => sum + lote.quantidade,
        0
      );

      if (product.estoqueAtual !== realStock) {
        updates.push(
          prisma.product.update({
            where: { id: product.id },
            data: { estoqueAtual: realStock },
          })
        );
        updatedCount++;
      }
    }

    // 3. Executar atualizações em transação (ou Promise.all para performance)
    if (updates.length > 0) {
      await prisma.$transaction(updates);
    }

    return NextResponse.json({
      message: "Recálculo concluído com sucesso",
      totalProducts: products.length,
      updatedProducts: updatedCount,
    });
  } catch (error) {
    console.error("Erro ao recalcular estoque:", error);
    return NextResponse.json(
      { error: "Erro interno ao recalcular estoque" },
      { status: 500 }
    );
  }
}
