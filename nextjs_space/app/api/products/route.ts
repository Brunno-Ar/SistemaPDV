import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getFileUrl } from "@/lib/s3";

export const dynamic = "force-dynamic";

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

    // Converter Decimal para number e assinar URLs de imagem
    const serializedProducts = await Promise.all(
      products.map(async (product: any) => {
        let signedUrl = null;
        if (product.imagemUrl) {
          try {
            signedUrl = await getFileUrl(product.imagemUrl, 3600); // 1 hora de validade
          } catch (e) {
            console.error(`Erro ao assinar URL para produto ${product.id}`, e);
          }
        }

        return {
          ...product,
          precoVenda: Number(product.precoVenda),
          imagemUrl: signedUrl || product.imagemUrl, // Substitui pela URL assinada ou mantém a original se falhar
        };
      })
    );

    return NextResponse.json(serializedProducts);
  } catch (error: any) {
    console.error("Erro detalhado ao buscar produtos:", error);

    let errorMessage = "Erro ao buscar produtos";
    if (error.message) {
      errorMessage = error.message;
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
