import { NextRequest, NextResponse } from "next/server";
import { getFileUrl } from "@/lib/s3";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const key = searchParams.get("key");

    if (!key) {
      return NextResponse.json({ error: "Key é obrigatório" }, { status: 400 });
    }

    // Gerar URL assinada válida por 1 hora
    const signedUrl = await getFileUrl(key, 3600);

    return NextResponse.json({ url: signedUrl });
  } catch (error) {
    console.error("Erro ao gerar URL assinada:", error);
    return NextResponse.json(
      { error: "Erro ao gerar URL da imagem" },
      { status: 500 },
    );
  }
}
