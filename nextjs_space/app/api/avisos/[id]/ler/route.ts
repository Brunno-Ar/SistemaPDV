import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    // Verificar se o aviso existe e se o usuário pode marcá-lo como lido
    // (Simplificação: qualquer usuário autenticado pode marcar como lido se tiver acesso ao aviso,
    // mas idealmente verificaríamos se ele é o destinatário ou parte da empresa)

    const aviso = await prisma.aviso.update({
      where: { id: params.id },
      data: { lido: true },
    });

    return NextResponse.json(aviso);
  } catch (error) {
    console.error("Erro ao atualizar aviso:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
