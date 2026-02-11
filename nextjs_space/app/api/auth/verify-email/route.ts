import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { error: "Token não fornecido" },
        { status: 400 },
      );
    }

    const verificationToken = await prisma.verificationToken.findFirst({
      where: { token },
    });

    if (!verificationToken) {
      return NextResponse.json({ error: "Token inválido" }, { status: 400 });
    }

    if (new Date() > verificationToken.expires) {
      return NextResponse.json({ error: "Token expirado" }, { status: 400 });
    }

    const user = await prisma.user.findFirst({
      where: { email: verificationToken.identifier },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Usuário não encontrado" },
        { status: 404 },
      );
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: new Date() },
    });

    await prisma.verificationToken.delete({
      where: {
        identifier_token: {
          identifier: verificationToken.identifier,
          token: verificationToken.token,
        },
      },
    });

    return NextResponse.json({ message: "Email verificado com sucesso" });
  } catch (error) {
    console.error("Erro ao verificar email:", error);
    return NextResponse.json(
      { error: "Erro interno ao verificar email" },
      { status: 500 },
    );
  }
}
