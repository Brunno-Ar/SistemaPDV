import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Grace Period em dias (tolerância para pagamento atrasado)
const GRACE_PERIOD_DAYS = parseInt(
  process.env.ASAAS_GRACE_PERIOD_DAYS || "5",
  10,
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
        { status: 500 },
      );
    }

    if (!token || token !== secret) {
      console.warn("⚠️ [Webhook] Token inválido recebido");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { event, payment, subscription } = body;

    // Extrair ID do evento para idempotência
    const eventId =
      body.id || `${event}_${payment?.id || subscription?.id}_${Date.now()}`;

    // Determinar o customerId baseado no tipo de evento
    const customerId = payment?.customer || subscription?.customer;

    // ========== VALIDAÇÃO DO PAYLOAD ==========
    // Eventos de payment precisam de payment.customer
    // Eventos de subscription precisam de subscription.customer
    if (!customerId) {
      console.warn(
        "⚠️ [Webhook] Payload inválido - sem customer em payment ou subscription",
      );
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    // ========== BUSCAR EMPRESA ==========
    const empresa = await prisma.empresa.findUnique({
      where: { asaasCustomerId: customerId },
    });

    if (!empresa) {
      console.warn(
        `⚠️ [Webhook] Empresa não encontrada para customer: ${payment.customer}`,
      );
      // Retorna 200 para o Asaas não ficar reenviando
      return NextResponse.json({ message: "Customer not found, ignored" });
    }

    // ========== VERIFICAÇÃO DE IDEMPOTÊNCIA ==========
    if (empresa.webhookEventId === eventId) {
      return NextResponse.json({ message: "Event already processed" });
    }

    // ========== PROCESSAR EVENTOS ==========
    if (event === "PAYMENT_RECEIVED" || event === "PAYMENT_CONFIRMED") {
      // Pagamento confirmado: Renovar plano

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
          webhookEventId: eventId,
        },
      });

      // ========== MEMBER GET MEMBER: RECOMPENSA ==========
      // Verifica se esta empresa que acabou de pagar é uma indicação pendente
      try {
        const conversaoPendente = await prisma.memberConversion.findUnique({
          where: { novaEmpresaId: empresa.id },
          include: {
            link: {
              include: {
                empresa: true,
              },
            },
          },
        });

        // Só aplica recompensa se for TRIAL e ainda não tiver sido gerado (1º pagamento)
        if (
          conversaoPendente &&
          conversaoPendente.status === "TRIAL" &&
          !conversaoPendente.mesGratisGerado
        ) {
          const empresaIndicadora = conversaoPendente.link.empresa;
          const { asaas } = await import("@/lib/asaas");

          let recompensaAplicada = false;
          let asaasErrorMsg = null;

          if (empresaIndicadora.asaasSubscriptionId) {
            try {
              // Buscar a próxima cobrança pendente
              const pendingPaymentId = await asaas.getPendingPaymentId(
                empresaIndicadora.asaasSubscriptionId,
              );

              if (pendingPaymentId) {
                // Aplicar 100% de desconto
                await asaas.apply100PercentDiscount(pendingPaymentId);
                recompensaAplicada = true;
                console.log(
                  `🎁 [MGM] Recompensa aplicada! Empresa "${empresaIndicadora.nome}" ganhou 100% de desconto na cobrança ${pendingPaymentId} pela indicação da empresa "${empresa.nome}"`,
                );
              } else {
                asaasErrorMsg =
                  "Nenhuma cobrança pendente encontrada para aplicar o desconto.";
                console.warn(`⚠️ [MGM] ${asaasErrorMsg}`);
              }
            } catch (asaasErr: any) {
              asaasErrorMsg = asaasErr.message || "Erro desconhecido na API do Asaas";
              console.error(
                "⚠️ [MGM] Falha ao aplicar desconto de 100% no Asaas:",
                asaasErrorMsg,
              );
            }
          } else {
            asaasErrorMsg = "Empresa indicadora não possui assinatura Asaas.";
          }

          // Atualizar o status da conversão.
          // Se falhou, salva o erro para tentativa futura
          await prisma.memberConversion.update({
            where: { id: conversaoPendente.id },
            data: {
              status: "PAGO",
              mesGratisGerado: recompensaAplicada,
              errorLog: asaasErrorMsg,
            },
          });
        }
      } catch (mgmError) {
        console.error(
          "⚠️ [MGM] Erro ao processar recompensa de indicação:",
          mgmError,
        );
      }
    } else if (event === "PAYMENT_OVERDUE") {
      // Pagamento atrasado: Verificar grace period antes de pausar

      // Calcular quantos dias de atraso
      const dataVencimentoPagamento = payment.dueDate
        ? new Date(payment.dueDate)
        : null;
      let diasAtraso = 0;

      if (dataVencimentoPagamento) {
        const hoje = new Date();
        diasAtraso = Math.floor(
          (hoje.getTime() - dataVencimentoPagamento.getTime()) /
            (1000 * 60 * 60 * 24),
        );
      }

      if (diasAtraso >= GRACE_PERIOD_DAYS) {
        // Passou do grace period: Pausar empresa
        await prisma.empresa.update({
          where: { id: empresa.id },
          data: {
            status: "PAUSADO",
            webhookEventId: eventId,
          },
        });
      } else {
        // Ainda dentro do grace period: Apenas registrar, não pausar
        await prisma.empresa.update({
          where: { id: empresa.id },
          data: {
            webhookEventId: eventId,
          },
        });
      }
    } else if (
      event === "SUBSCRIPTION_DELETED" ||
      event === "SUBSCRIPTION_INACTIVATED"
    ) {
      // Assinatura cancelada/inativada externamente

      await prisma.empresa.update({
        where: { id: empresa.id },
        data: {
          status: "CANCELADO",
          webhookEventId: eventId,
        },
      });
    } else {
      // Evento não tratado
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("❌ [Webhook] Erro ao processar:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
