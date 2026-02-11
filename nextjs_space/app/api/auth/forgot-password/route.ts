import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/mail";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email é obrigatório" },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Nenhum usuário encontrado com este e-mail." },
        { status: 404 },
      );
    }

    // Generate random password
    const chars =
      "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let password = "";
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        mustChangePassword: true,
      },
    });

    await sendEmail({
      to: user.email,
      subject: "Recuperação de Senha - Flow PDV",
      text: `Sua nova senha temporária é: ${password}\n\nPor favor, faça login e altere sua senha imediatamente.`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #2563eb;">Recuperação de Senha</h2>
          <p>Você solicitou a recuperação de senha para sua conta no Flow PDV.</p>
          <p>Sua nova senha temporária é:</p>
          <div style="background: #f4f4f5; padding: 15px; border-radius: 8px; font-family: monospace; font-size: 24px; letter-spacing: 2px; text-align: center; margin: 20px 0; border: 1px solid #e4e4e7;">
            ${password}
          </div>
          <p><strong>Importante:</strong> Esta senha é temporária. Faça login e altere-a imediatamente em Configurações > Segurança.</p>
          <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 20px 0;" />
          <p style="font-size: 12px; color: #71717a;">Se você não solicitou esta alteração, entre em contato com o suporte imediatamente.</p>
        </div>
      `,
    });

    return NextResponse.json({ message: "Email enviado com sucesso" });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error: "Erro ao processar solicitação" },
      { status: 500 },
    );
  }
}
