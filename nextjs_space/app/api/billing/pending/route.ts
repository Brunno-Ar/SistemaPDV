import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/db";
import { asaas } from "@/lib/asaas";
import { authOptions } from "@/lib/auth";
import { montarRespostaFatura, respostaGenerica } from "@/lib/billing-pending";
import { criarLimitador, ipDaRequisicao } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

// Rate limit por IP. ponytail: em memoria/instancia; trocar por store
// compartilhado se o deploy escalar horizontalmente.
const limitador = criarLimitador({ limite: 20, janelaMs: 60_000 });

/**
 * GET /api/billing/pending
 * Busca a fatura pendente da PRÓPRIA conta autenticada (página de bloqueio).
 * O email vem da sessão; a query é ignorada para não permitir enumeração.
 * Ausência de conta/assinatura/fatura devolve resposta genérica idêntica.
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Anti-abuso: limita varredura da rota por IP antes de tocar o banco.
    if (!limitador.permitir(ipDaRequisicao(request.headers))) {
      return NextResponse.json(respostaGenerica().body, { status: 429 });
    }

    const session = await getServerSession(authOptions);
    const email = session?.user?.email?.toLowerCase() ?? null;

    if (!email) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    // 2. Buscar usuário pelo email da SESSÃO (nunca por query param).
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
      const resposta = respostaGenerica();
      return NextResponse.json(resposta.body, { status: resposta.status });
    }

    const empresa = user.empresa;

    // Sem assinatura no Asaas: mesma resposta genérica (não distingue a conta).
    if (!empresa.asaasSubscriptionId) {
      const resposta = respostaGenerica();
      return NextResponse.json(resposta.body, { status: resposta.status });
    }

    // 3. Buscar fatura pendente no Asaas.
    try {
      const billingInfo = await asaas.getSubscriptionBillingInfo(
        empresa.asaasSubscriptionId,
      );

      if (billingInfo) {
        const resposta = montarRespostaFatura({
          caso: "fatura",
          value: billingInfo.value,
          invoiceUrl: billingInfo.invoiceUrl,
          status: "PENDING",
          dueDate: billingInfo.dueDate,
        });
        return NextResponse.json(resposta.body, { status: resposta.status });
      }

      // Sem fatura pendente: buscar o histórico para pegar faturas PENDING/OVERDUE.
      const history = await asaas.listPaymentHistory(
        empresa.asaasSubscriptionId,
      );

      const pendingPayment = (history ?? []).find(
        (p) => p.status === "PENDING" || p.status === "OVERDUE",
      );

      if (pendingPayment) {
        const resposta = montarRespostaFatura({
          caso: "fatura",
          value: pendingPayment.value,
          invoiceUrl: pendingPayment.invoiceUrl,
          status: pendingPayment.status,
          dueDate: pendingPayment.dueDate,
        });
        return NextResponse.json(resposta.body, { status: resposta.status });
      }

      const resposta = respostaGenerica();
      return NextResponse.json(resposta.body, { status: resposta.status });
    } catch (asaasError) {
      // Falha do Asaas não pode virar um sinal distinguível: resposta genérica.
      console.error("Erro ao buscar fatura no Asaas:", asaasError);
      const resposta = respostaGenerica();
      return NextResponse.json(resposta.body, { status: resposta.status });
    }
  } catch (error) {
    console.error("Erro na API billing/pending:", error);
    return NextResponse.json({ billing: null }, { status: 500 });
  }
}
