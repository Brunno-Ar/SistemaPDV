import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { ref } = body;

    if (!ref || typeof ref !== "string") {
      return NextResponse.json(
        { error: "Código de referência inválido" },
        { status: 400 },
      );
    }

    const link = await prisma.memberLink.findUnique({
      where: { codigoURL: ref },
    });

    if (!link || !link.ativo) {
      return NextResponse.json(
        { error: "Link de indicação não encontrado ou inativo" },
        { status: 404 },
      );
    }

    await prisma.memberLink.update({
      where: { id: link.id },
      data: { cliques: { increment: 1 } },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
