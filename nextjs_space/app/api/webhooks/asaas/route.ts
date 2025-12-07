import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Grace Period em dias (tolerância para pagamento atrasado)
const GRACE_PERIOD_DAYS = parseInt(
  process.env.ASAAS_GRACE_PERIOD_DAYS || "5",
  10
);

export async function POST(req: NextRequest) {
  try {
    // ========== VALIDAÇÃO DE SEGURANÇA ==========
    const token = req.headers.get("asaas-access-token");
    const secret = process.env.ASAAS_WEBHOOK_SECRET;

    if (!secret) {
      console.error("❌ [Webhook] ASAAS_WEBHOOK_SECRET não configurado");
      return NextResponse.json(
        { error: "Server misconfiguration" },
        { status: 500 }
      );
    }

    if (!token || token !== secret) {
      console.warn("⚠️ [Webhook] Token inválido recebido");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { event, payment } = body;

    // Extrair ID do evento para idempotência
    const eventId = body.id || `${event}_${payment?.id}_${Date.now()}`;

    console.log("📥 [Webhook] Evento recebido:", {
      event,
      eventId,
      paymentId: payment?.id,
      customerId: payment?.customer,
    });

    // ========== VALIDAÇÃO DO PAYLOAD ==========
    if (!payment || !payment.customer) {
      console.warn("⚠️ [Webhook] Payload inválido - sem payment ou customer");
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    // ========== BUSCAR EMPRESA ==========
    const empresa = await prisma.empresa.findUnique({
      where: { asaasCustomerId: payment.customer },
    });

    if (!empresa) {
      console.warn(
        `⚠️ [Webhook] Empresa não encontrada para customer: ${payment.customer}`
      );
      // Retorna 200 para o Asaas não ficar reenviando
      return NextResponse.json({ message: "Customer not found, ignored" });
    }

    // ========== VERIFICAÇÃO DE IDEMPOTÊNCIA ==========
    if (empresa.webhookEventId === eventId) {
      console.log(`ℹ️ [Webhook] Evento ${eventId} já processado, ignorando`);
      return NextResponse.json({ message: "Event already processed" });
    }

    // ========== PROCESSAR EVENTOS ==========
    if (event === "PAYMENT_RECEIVED" || event === "PAYMENT_CONFIRMED") {
      // Pagamento confirmado: Renovar plano
      console.log(
        `💰 [Webhook] Pagamento confirmado para empresa: ${empresa.nome}`
      );

      const hoje = new Date();
      let novoVencimento: Date;

      // Regra: Se vencimento atual > hoje, adiciona 1 mês ao vencimento atual
      // Se não, adiciona 1 mês a partir de hoje
      if (empresa.vencimentoPlano && empresa.vencimentoPlano > hoje) {
        novoVencimento = new Date(empresa.vencimentoPlano);
      } else {
        novoVencimento = new Date();
      }

      // Adicionar 1 mês de forma segura (lidando com fim de mês)
      const currentDay = novoVencimento.getDate();
      novoVencimento.setMonth(novoVencimento.getMonth() + 1);

      // Se o dia mudou (ex: 31/01 -> 02/03), volta para o último dia do mês anterior
      if (novoVencimento.getDate() !== currentDay) {
        novoVencimento.setDate(0);
      }

      await prisma.empresa.update({
        where: { id: empresa.id },
        data: {
          status: "ATIVO",
          vencimentoPlano: novoVencimento,
          webhookEventId: eventId, // Salvar para idempotência
        },
      });

      console.log(
        `✅ [Webhook] Empresa ${
          empresa.nome
        } renovada até ${novoVencimento.toISOString()}`
      );
    } else if (event === "PAYMENT_OVERDUE") {
      // Pagamento atrasado: Verificar grace period antes de pausar
      console.log(
        `⏰ [Webhook] Pagamento atrasado para empresa: ${empresa.nome}`
      );

      // Calcular quantos dias de atraso
      const dataVencimentoPagamento = payment.dueDate
        ? new Date(payment.dueDate)
        : null;
      let diasAtraso = 0;

      if (dataVencimentoPagamento) {
        const hoje = new Date();
        diasAtraso = Math.floor(
          (hoje.getTime() - dataVencimentoPagamento.getTime()) /
            (1000 * 60 * 60 * 24)
        );
      }

      console.log(
        `ℹ️ [Webhook] Dias de atraso: ${diasAtraso}, Grace Period: ${GRACE_PERIOD_DAYS} dias`
      );

      if (diasAtraso >= GRACE_PERIOD_DAYS) {
        // Passou do grace period: Pausar empresa
        await prisma.empresa.update({
          where: { id: empresa.id },
          data: {
            status: "PAUSADO",
            webhookEventId: eventId,
          },
        });
        console.log(
          `🔴 [Webhook] Empresa ${empresa.nome} PAUSADA por inadimplência (${diasAtraso} dias de atraso)`
        );
      } else {
        // Ainda dentro do grace period: Apenas registrar, não pausar
        await prisma.empresa.update({
          where: { id: empresa.id },
          data: {
            webhookEventId: eventId,
          },
        });
        console.log(
          `⚠️ [Webhook] Empresa ${empresa.nome} em grace period - ${
            GRACE_PERIOD_DAYS - diasAtraso
          } dias restantes para pagar`
        );
      }
    } else if (
      event === "SUBSCRIPTION_DELETED" ||
      event === "SUBSCRIPTION_INACTIVATED"
    ) {
      // Assinatura cancelada/inativada externamente
      console.log(
        `🗑️ [Webhook] Assinatura cancelada para empresa: ${empresa.nome}`
      );

      await prisma.empresa.update({
        where: { id: empresa.id },
        data: {
          status: "CANCELADO",
          webhookEventId: eventId,
        },
      });
      console.log(
        `✅ [Webhook] Empresa ${empresa.nome} marcada como CANCELADO`
      );
    } else {
      // Evento não tratado
      console.log(`ℹ️ [Webhook] Evento ${event} ignorado (não tratado)`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("❌ [Webhook] Erro ao processar:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
