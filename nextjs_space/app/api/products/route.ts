import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

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

    // 🚀 Otimização: Retornar produtos diretamente sem assinar URLs S3 síncronamente
    // A assinatura de URLs S3 é feita sob demanda no frontend quando a imagem é requisitada
    // Isso reduz drasticamente o tempo de resposta da API
    const serializedProducts = products.map((product: any) => ({
      ...product,
      precoVenda: Number(product.precoVenda),
      // imagemUrl mantida como está - frontend pode assinar sob demanda se necessário
    }));

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
