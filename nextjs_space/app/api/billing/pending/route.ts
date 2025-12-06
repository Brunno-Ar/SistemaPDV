import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { asaas } from "@/lib/asaas";

export const dynamic = "force-dynamic";

/**
 * GET /api/billing/pending?email=xxx
 * Busca fatura pendente para um email (usado na página de bloqueio)
 */
export async function GET(request: NextRequest) {
  try {
    const email = request.nextUrl.searchParams.get("email");

    if (!email) {
      return NextResponse.json({ error: "Email obrigatório" }, { status: 400 });
    }

    // Buscar usuário pelo email
    const user = await prisma.user.findFirst({
      where: {
        email: {
          equals: email,
          mode: "insensitive",
        },
      },
      include: {
        empresa: true,
      },
    });

    if (!user || !user.empresa) {
      return NextResponse.json(
        { error: "Usuário não encontrado" },
        { status: 404 }
      );
    }

    const empresa = user.empresa;

    // Se não tem assinatura no Asaas, retornar sem fatura
    if (!empresa.asaasSubscriptionId) {
      return NextResponse.json({
        billing: null,
        message: "Empresa sem assinatura ativa no Asaas",
      });
    }

    // Buscar fatura pendente no Asaas
    try {
      const billingInfo = await asaas.getSubscriptionBillingInfo(
        empresa.asaasSubscriptionId
      );

      if (billingInfo) {
        return NextResponse.json({
          billing: {
            value: billingInfo.value,
            invoiceUrl: billingInfo.invoiceUrl,
            status: "PENDING",
            vencimento: new Date(billingInfo.dueDate).toLocaleDateString(
              "pt-BR"
            ),
          },
        });
      }

      // Se não tem fatura pendente, buscar o histórico para pegar a última
      const history = await asaas.listPaymentHistory(
        empresa.asaasSubscriptionId
      );

      // Procurar por faturas PENDING ou OVERDUE
      const pendingPayment = history.find(
        (p: any) => p.status === "PENDING" || p.status === "OVERDUE"
      );

      if (pendingPayment) {
        return NextResponse.json({
          billing: {
            value: pendingPayment.value,
            invoiceUrl: pendingPayment.invoiceUrl,
            status: pendingPayment.status,
            vencimento: new Date(pendingPayment.dueDate).toLocaleDateString(
              "pt-BR"
            ),
          },
        });
      }

      return NextResponse.json({
        billing: null,
        message: "Nenhuma fatura pendente encontrada",
      });
    } catch (asaasError) {
      console.error("Erro ao buscar fatura no Asaas:", asaasError);
      return NextResponse.json({
        billing: null,
        message: "Erro ao consultar Asaas",
      });
    }
  } catch (error) {
    console.error("Erro na API billing/pending:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
