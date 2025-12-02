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

    // Mock email sending: return password in response (DEV ONLY)
    // In production, this would send an email via Nodemailer/Resend/SendGrid
    return NextResponse.json(
      {
        message:
          "Se o e-mail estiver cadastrado, você receberá as instruções em instantes.",
        // TODO: Remove this in production
        tempPassword: temporaryPassword,
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
