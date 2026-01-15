import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.empresaId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { role } = session.user;
    if (role !== "admin" && role !== "master") {
      return NextResponse.json(
        { error: "Apenas administradores podem alterar essa senha." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { password } = body;

    if (!password || password.length < 4) {
      return NextResponse.json(
        { error: "A senha deve ter pelo menos 4 caracteres." },
        { status: 400 }
      );
    }

    // Hash da senha antes de salvar
    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.empresa.update({
      where: { id: session.user.empresaId },
      data: {
        senhaAutorizacao: hashedPassword,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Senha de autorização atualizada com sucesso.",
    });
  } catch (error) {
    console.error("Erro ao salvar senha de autorização:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
