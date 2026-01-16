import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { uploadFile } from "@/lib/s3";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // Verificar se é admin
    if (session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Apenas administradores podem fazer upload de imagens" },
        { status: 403 },
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "Nenhum arquivo foi enviado" },
        { status: 400 },
      );
    }

    // Validar tipo de arquivo
    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "image/gif",
    ];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        {
          error:
            "Tipo de arquivo não permitido. Use apenas imagens (JPEG, PNG, WebP, GIF)",
        },
        { status: 400 },
      );
    }

    // Validar tamanho (máx 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Arquivo muito grande. Tamanho máximo: 5MB" },
        { status: 400 },
      );
    }

    // Converter para buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Gerar nome único para o arquivo
    const timestamp = Date.now();
    const extension = file.name.split(".").pop();
    const fileName = `produtos/${timestamp}-${Math.random().toString(36).substring(7)}.${extension}`;

    // Upload para S3
    const cloud_storage_path = await uploadFile(buffer, fileName);

    return NextResponse.json({
      message: "Upload realizado com sucesso",
      cloud_storage_path,
    });
  } catch (error) {
    console.error("Erro ao fazer upload:", error);
    return NextResponse.json(
      { error: "Erro ao fazer upload da imagem" },
      { status: 500 },
    );
  }
}
