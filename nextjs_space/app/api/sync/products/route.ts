import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getFileUrl } from "@/lib/s3";

// Helper para processar URLs em batches (evita sobrecarga)
async function signUrlsInBatches(products: any[], batchSize = 10) {
  const results: any[] = [];

  for (let i = 0; i < products.length; i += batchSize) {
    const batch = products.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(async (product: any) => {
        let finalImageUrl: string | null = null;

        if (product.imagemUrl) {
          // Se já é uma URL completa (http/https), usa direto
          if (
            product.imagemUrl.startsWith("http://") ||
            product.imagemUrl.startsWith("https://")
          ) {
            finalImageUrl = product.imagemUrl;
          } else {
            // É um path do S3, precisa gerar signed URL
            try {
              finalImageUrl = await getFileUrl(product.imagemUrl, 3600);
            } catch (e) {
              // Se falhar, NÃO usa o path original (evita 404 local)
              // Retorna null para mostrar o placeholder
              console.error(
                `[SYNC] Erro ao assinar URL para produto ${product.id} (path: ${product.imagemUrl})`,
                e
              );
              finalImageUrl = null;
            }
          }
        }

        return {
          id: product.id,
          nome: product.nome,
          sku: product.sku,
          precoVenda: Number(product.precoVenda),
          estoqueAtual: product.estoqueAtual,
          imagemUrl: finalImageUrl,
        };
      })
    );
    results.push(...batchResults);
  }

  return results;
}

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || !session.user.empresaId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const products = await prisma.product.findMany({
      where: {
        empresaId: session.user.empresaId,
      },
      select: {
        id: true,
        nome: true,
        sku: true,
        precoVenda: true,
        estoqueAtual: true,
        imagemUrl: true,
      },
    });

    // Processar URLs em batches para gerar signed URLs
    const formattedProducts = await signUrlsInBatches(products, 10);

    return NextResponse.json(formattedProducts);
  } catch (error) {
    console.error("[SYNC_PRODUCTS_ERROR]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
