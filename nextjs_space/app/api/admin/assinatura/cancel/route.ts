import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { asaas } from "@/lib/asaas";

export async function POST(request: Request) {
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
        { error: "Apenas administradores podem cancelar a assinatura" },
        { status: 403 }
      );
    }

    if (!user.empresa) {
      return NextResponse.json(
        { error: "Empresa não encontrada" },
        { status: 404 }
      );
    }

    const { empresa } = user as any;

    if (!empresa.asaasSubscriptionId) {
      return NextResponse.json(
        { error: "Assinatura não encontrada no Asaas" },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { motivo } = body;

    // Cancelar assinatura no Asaas
    console.log("🗑️ Cancelando assinatura:", empresa.asaasSubscriptionId);
    await asaas.cancelSubscription(empresa.asaasSubscriptionId);

    // Registrar motivo do cancelamento
    // Verifica se tabela Cancelamento existe no prisma client gerado
    try {
      const prismaAny = prisma as any;
      await prismaAny.cancelamento.create({
        data: {
          empresaId: empresa.id,
          motivo: motivo || "Motivo não informado",
        },
      });
    } catch (e) {
      console.warn(
        "⚠️ Erro ao salvar motivo de cancelamento (pode ser problema de sync do prisma):",
        e
      );
    }

    // Atualizar status para CANCELADO
    await prisma.empresa.update({
      where: { id: empresa.id },
      data: {
        status: "CANCELADO" as any,
      },
    });

    console.log("✅ Assinatura cancelada para empresa:", empresa.nome);

    return NextResponse.json({
      success: true,
      message:
        "Assinatura cancelada com sucesso. O acesso continua até o fim do período pago.",
    });
  } catch (error) {
    console.error("❌ Erro ao cancelar assinatura:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro ao cancelar assinatura",
      },
      { status: 500 }
    );
  }
}
