import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getFileUrl } from "@/lib/s3";

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
        sku: true,
        precoVenda: true,
        estoqueAtual: true,
        imagemUrl: true,
      },
      take: 20,
    });

    const formattedProducts = await Promise.all(
      products.map(async (p) => {
        let signedUrl = null;
        if (p.imagemUrl) {
          try {
            signedUrl = await getFileUrl(p.imagemUrl, 3600);
          } catch (e) {
            console.error(`Erro ao assinar URL para produto ${p.id}`, e);
          }
        }

        return {
          ...p,
          precoVenda: Number(p.precoVenda),
          imagemUrl: signedUrl || p.imagemUrl,
        };
      })
    );

    return NextResponse.json(formattedProducts);
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
