import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email e senha são obrigatórios" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        empresa: true,
      },
    });

    if (!user || !user.password) {
      return NextResponse.json(
        { error: "Credenciais inválidas" },
        { status: 401 }
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "Credenciais inválidas" },
        { status: 401 }
      );
    }

    if (!user.empresa) {
      return NextResponse.json(
        { error: "Usuário não possui uma empresa associada" },
        { status: 400 }
      );
    }

    const empresa: any = user.empresa;

    if (empresa.status !== "PAUSADO") {
      return NextResponse.json(
        { error: "Esta empresa não está pausada" },
        { status: 400 }
      );
    }

    // Verificar Cooldown (20 dias)
    if (empresa.ultimoDesbloqueio) {
      const ultimoDesbloqueio = new Date(empresa.ultimoDesbloqueio);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - ultimoDesbloqueio.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays < 20) {
        return NextResponse.json(
          {
            error: `Você já utilizou o desbloqueio temporário recentemente. Tente novamente em ${
              20 - diffDays
            } dias ou entre em contato com o suporte.`,
          },
          { status: 400 }
        );
      }
    }

    // Aplicar Desbloqueio de 24h
    const tomorrow = new Date();
    tomorrow.setHours(tomorrow.getHours() + 24);

    await prisma.empresa.update({
      where: { id: empresa.id },
      data: {
        liberacaoTemporariaAte: tomorrow,
        ultimoDesbloqueio: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Acesso liberado temporariamente por 24 horas",
    });
  } catch (error) {
    console.error("Erro no desbloqueio público:", error);
    return NextResponse.json(
      { error: "Erro interno ao processar desbloqueio" },
      { status: 500 }
    );
  }
}
