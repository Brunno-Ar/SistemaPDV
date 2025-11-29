import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.empresaId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query");

    if (!query || query.trim() === "") {
      return NextResponse.json([]);
    }

    const products = await prisma.product.findMany({
      where: {
        empresaId: session.user.empresaId,
        OR: [
          { nome: { contains: query, mode: "insensitive" } },
          { sku: { contains: query, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        nome: true,
        precoVenda: true,
        estoqueAtual: true,
        imagemUrl: true,
      },
      take: 20,
    });

    // Convert Decimal to number for JSON serialization if necessary
    // Prisma usually handles this but sometimes it returns strings for Decimals.
    // Let's map to be safe if precoVenda is Decimal.
    const formattedProducts = products.map((p) => ({
      ...p,
      precoVenda: Number(p.precoVenda),
    }));

    return NextResponse.json(formattedProducts);
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
