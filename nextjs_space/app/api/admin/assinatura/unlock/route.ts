import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    // Buscar usuário e empresa
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { empresa: true },
    });

    if (!user || user.role !== "admin") {
      return NextResponse.json(
        { error: "Apenas administradores podem solicitar desbloqueio" },
        { status: 403 }
      );
    }

    if (!user.empresa) {
      return NextResponse.json(
        { error: "Empresa não encontrada" },
        { status: 404 }
      );
    }

    const { status, ultimoDesbloqueio } = user.empresa;

    if (status !== "PAUSADO") {
      return NextResponse.json(
        { error: "O desbloqueio só está disponível para contas suspensas" },
        { status: 400 }
      );
    }

    const now = new Date();
    const vinteDias = 20 * 24 * 60 * 60 * 1000; // 20 dias em ms

    if (ultimoDesbloqueio) {
      const diff = now.getTime() - new Date(ultimoDesbloqueio).getTime();
      if (diff < vinteDias) {
        const diasRestantes = Math.ceil(
          (vinteDias - diff) / (24 * 60 * 60 * 1000)
        );
        return NextResponse.json(
          {
            error: `Desbloqueio indisponível. Tente novamente em ${diasRestantes} dias.`,
            unavailable: true,
          },
          { status: 403 }
        );
      }
    }

    // Aplicar desbloqueio de 24h
    const amanha = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    await prisma.empresa.update({
      where: { id: user.empresa.id },
      data: {
        liberacaoTemporariaAte: amanha,
        ultimoDesbloqueio: now,
      },
    });

    console.log(`🔓 Desbloqueio temporário ativado para ${user.empresa.nome}`);

    return NextResponse.json({
      success: true,
      message:
        "Acesso liberado por 24 horas! Regularize seu pagamento neste período.",
      liberacaoAte: amanha,
    });
  } catch (error) {
    console.error("❌ Erro ao desbloquear:", error);
    return NextResponse.json(
      { error: "Erro ao processar solicitação" },
      { status: 500 }
    );
  }
}
