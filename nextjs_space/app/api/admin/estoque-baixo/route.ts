import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET - Listar produtos com estoque baixo (estoqueAtual <= estoqueMinimo)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (
      !session ||
      (session.user.role !== "admin" && session.user.role !== "master" && session.user.role !== "gerente")
    ) {
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

    // Buscar produtos onde estoqueAtual <= estoqueMinimo
    const produtosEstoqueBaixo = await prisma.$queryRaw`
      SELECT 
        id,
        nome,
        sku,
        preco_venda as "precoVenda",
        estoque_atual as "estoqueAtual",
        estoque_minimo as "estoqueMinimo",
        imagem_url as "imagemUrl",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM products
      WHERE empresa_id = ${empresaId}
      AND estoque_atual <= estoque_minimo
      ORDER BY (estoque_minimo - estoque_atual) DESC
    `;

    return NextResponse.json(produtosEstoqueBaixo);
  } catch (error) {
    console.error("Erro ao buscar produtos com estoque baixo:", error);
    return NextResponse.json(
      { error: "Erro ao buscar produtos com estoque baixo" },
      { status: 500 }
    );
  }
}
