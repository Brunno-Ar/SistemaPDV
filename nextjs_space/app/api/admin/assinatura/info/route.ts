import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { asaas } from "@/lib/asaas";

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (
    !session ||
    (session.user.role !== "admin" && session.user.role !== "master")
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const empresaId = session.user.empresaId;
  if (!empresaId) {
    return NextResponse.json(
      { error: "Empresa não encontrada" },
      { status: 404 },
    );
  }

  try {
    const empresa = await prisma.empresa.findUnique({
      where: { id: empresaId },
    });

    if (!empresa) {
      return NextResponse.json(
        { error: "Empresa não encontrada" },
        { status: 404 },
      );
    }

    if (!empresa.asaasSubscriptionId) {
      // Se não tem assinatura Asaas (legado ou erro), retorna nulo mas sucesso
      return NextResponse.json({
        status: empresa.status,
        vencimentoPlano: empresa.vencimentoPlano,
        plano: empresa.plano || "PRO",
        subscription: null,
        billing: null,
        history: [],
      });
    }

    // Buscar info atual da assinatura (fatura aberta)
    const billingInfo = await asaas.getSubscriptionBillingInfo(
      empresa.asaasSubscriptionId,
    );

    // Buscar histórico
    const history = await asaas.listPaymentHistory(empresa.asaasSubscriptionId);

    return NextResponse.json({
      status: empresa.status,
      vencimentoPlano: empresa.vencimentoPlano,
      plano: empresa.plano || "PRO",
      subscription: {
        id: empresa.asaasSubscriptionId,
      },
      billing: billingInfo,
      history,
    });
  } catch (error) {
    console.error("Erro ao buscar dados da assinatura:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
