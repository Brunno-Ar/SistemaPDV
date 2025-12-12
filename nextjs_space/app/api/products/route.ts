import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getFileUrl } from "@/lib/s3";

export const dynamic = "force-dynamic";

// 🚀 Otimização: Função helper para processar em batches
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
            // Silently fail - use original URL
            console.error(`Erro ao assinar URL para produto ${product.id}`, e);
          }
        }
        return {
          ...product,
          precoVenda: Number(product.precoVenda),
          imagemUrl: signedUrl || product.imagemUrl,
        };
      })
    );
    results.push(...batchResults);
  }

  return results;
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const empresaId = session.user.empresaId;
    const isMaster = session.user.role === "master";

    // Se não é master e não tem empresaId, retorna erro
    if (!isMaster && !empresaId) {
      return NextResponse.json(
        { error: "Empresa não identificada" },
        { status: 400 }
      );
    }

    // Master pode ver todos os produtos, outros usuários veem apenas da sua empresa
    const products = await prisma.product.findMany({
      where: isMaster
        ? {}
        : {
            empresaId: empresaId,
          },
      orderBy: { nome: "asc" },
    });

    // 🚀 Otimização: Processar URLs em batches de 10 para evitar sobrecarga
    const serializedProducts = await signUrlsInBatches(products, 10);

    return NextResponse.json(serializedProducts);
  } catch (error: unknown) {
    console.error("Erro detalhado ao buscar produtos:", error);

    let errorMessage = "Erro ao buscar produtos";
    if (error instanceof Error) {
      errorMessage = error.message;
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
