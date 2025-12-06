import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

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

    const formattedProducts = products.map((p) => ({
      ...p,
      precoVenda: Number(p.precoVenda),
    }));

    return NextResponse.json(formattedProducts);
  } catch (error) {
    console.error("[SYNC_PRODUCTS_ERROR]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
