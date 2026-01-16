import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getFileUrl } from "@/lib/s3";

export const dynamic = "force-dynamic";

// 🚀 Otimização: Função helper para processar em batches (consistente com /api/products)
async function signUrlsInBatches(products: any[], batchSize = 10) {
  const results: any[] = [];

  for (let i = 0; i < products.length; i += batchSize) {
    const batch = products.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(async (product: any) => {
        let signedUrl = null;
        if (product.imagemUrl) {
          try {
            signedUrl = await getFileUrl(product.imagemUrl, 3600);
          } catch (e) {
            console.error(`Erro ao assinar URL para produto ${product.id}`, e);
          }
        }
        return {
          ...product,
          precoVenda: Number(product.precoVenda),
          imagemUrl: signedUrl || product.imagemUrl,
        };
      }),
    );
    results.push(...batchResults);
  }

  return results;
}

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
        sku: true,
        precoVenda: true,
        estoqueAtual: true,
        imagemUrl: true,
      },
      take: 20,
    });

    // 🚀 Otimização: Processar URLs em batches
    const formattedProducts = await signUrlsInBatches(products, 10);

    return NextResponse.json(formattedProducts);
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
