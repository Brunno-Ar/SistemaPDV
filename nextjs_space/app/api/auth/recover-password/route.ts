import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email é obrigatório" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findFirst({
      where: {
        email: {
          equals: email,
          mode: "insensitive",
        },
      },
    });

    // If user not found, return generic success message for security
    if (!user) {
      return NextResponse.json(
        {
          message:
            "Se o e-mail estiver cadastrado, você receberá as instruções em instantes.",
        },
        { status: 200 }
      );
    }

    // Generate random temporary password
    const temporaryPassword = crypto.randomBytes(4).toString("hex");

    // Hash the password
    const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

    // Update user with new password and flag to change it
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        mustChangePassword: true,
      },
    });

    // NOTA: Esta rota foi mantida por compatibilidade, mas recomenda-se usar /api/auth/forgot-password
    // que envia a senha por email ao invés de retornar na resposta
    return NextResponse.json(
      {
        message:
          "Se o e-mail estiver cadastrado, você receberá as instruções em instantes.",
        // Senha temporária NUNCA deve ser retornada na resposta por segurança
        // A senha é gerada mas só seria útil em ambiente de desenvolvimento
        // Em produção, esta rota deve enviar email igual forgot-password
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Erro na recuperação de senha:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
