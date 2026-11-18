import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  calcularDiasAtraso,
  deveBloquearPorAtraso,
  OVERDUE_GRACE_DAYS,
} from "@/lib/billing-policy";
import { aplicarRecompensaIndicacao } from "@/lib/fidelidade";
import { sincronizarBeneficiosCredito } from "@/lib/mgm-sync";
import { asaas } from "@/lib/asaas";
import {
  avancarVencimentoSeMaior,
  calcularVencimentoCobertura,
  decidirCreditoPagamento,
  eventoCreditaPlano,
} from "@/lib/pagamento";

// Grace period: regra unica (OVERDUE_GRACE_DAYS), fonte em lib/billing-policy.
// NAO ler de env - ASAAS_GRACE_PERIOD_DAYS divergente sobrescrevia a politica.
const GRACE_PERIOD_DAYS = OVERDUE_GRACE_DAYS;

/**
 * Falha de alinhamento de beneficio no Asaas depois do commit: 500 para o Asaas
 * reentregar. O credito ja esta persistido; o retry recompoe so o beneficio.
 */
function respostaBeneficioPendente(empresaId: string, falhas: string[]) {
  console.error(
    `[MGM] Alinhamento Asaas pendente (empresa ${empresaId}):`,
    falhas,
  );
  return NextResponse.json(
    { error: "Beneficio pendente de sincronizacao no Asaas" },
    { status: 500 },
  );
}

export async function POST(req: NextRequest) {
  try {
    // ========== VALIDACAO DE SEGURANCA ==========
    const token = req.headers.get("asaas-access-token");
    const secret = process.env.ASAAS_WEBHOOK_SECRET;

    if (!secret) {
      console.error("[Webhook] ASAAS_WEBHOOK_SECRET nao configurado");
      return NextResponse.json(
        { error: "Server misconfiguration" },
        { status: 500 },
      );
    }

    if (!token || token !== secret) {
      console.warn("[Webhook] Token invalido recebido");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { event, payment, subscription } = body;

    // Extrair ID do evento para idempotencia
    const eventId =
      body.id || `${event}_${payment?.id || subscription?.id}_${Date.now()}`;

    // Customer do evento (payment ou subscription)
    const customerId = payment?.customer || subscription?.customer;

    if (!customerId) {
      console.warn(
        "[Webhook] Payload invalido - sem customer em payment ou subscription",
      );
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    // ========== BUSCAR EMPRESA ==========
    const empresa = await prisma.empresa.findUnique({
      where: { asaasCustomerId: customerId },
    });

    if (!empresa) {
      console.warn(
        `[Webhook] Empresa nao encontrada para customer: ${customerId}`,
      );
      return NextResponse.json({ message: "Customer not found, ignored" });
    }

    // ========== IDEMPOTENCIA DO EVENTO ==========
    // Reentrega do MESMO evento: nunca uma segunda transacao/credito, mas o
    // beneficio MGM e reconciliado de novo. E aqui que o retry do Asaas fecha a
    // pendencia quando a primeira entrega falhou no Asaas depois do commit.
    if (empresa.webhookEventId === eventId) {
      if (eventoCreditaPlano(event)) {
        const falhasDedupe = await sincronizarBeneficiosCredito(empresa.id);
        if (falhasDedupe.length > 0) {
          return respostaBeneficioPendente(empresa.id, falhasDedupe);
        }
      }
      return NextResponse.json({ message: "Event already processed" });
    }

    // ========== PROCESSAR EVENTOS ==========
    // Credito (plano/referral/MGM) SO em PAYMENT_RECEIVED. `eventoCreditaPlano`
    // e a fonte unica: PAYMENT_CONFIRMED NAO credita, porque boleto/cartao podem
    // emitir CONFIRMED antes do RECEIVED (cartao pode aguardar ~32 dias).
    if (eventoCreditaPlano(event)) {
      const contextoPagamento = {
        asaasCustomerId: empresa.asaasCustomerId,
        asaasSubscriptionId: empresa.asaasSubscriptionId,
      };

      let pagamento = payment;
      let avaliacao = decidirCreditoPagamento(
        event,
        pagamento,
        contextoPagamento,
      );

      if (!avaliacao.processar && avaliacao.tipo === "definitivo") {
        // Recusa deterministica do proprio payload (id/identidade/valor). Sem
        // credito e SEM marcador: gravar `webhookEventId` aqui contaminaria o
        // dedupe da empresa com um evento que pode nem ser dela. O dedupe e
        // seguro por construcao — replay do mesmo payload cai na mesma recusa
        // antes de qualquer escrita.
        console.warn(
          `[Webhook] Pagamento recusado (empresa ${empresa.id}): ${avaliacao.motivo}`,
        );
        return NextResponse.json({ message: "Pagamento recusado" });
      }

      if (!avaliacao.processar) {
        // Dado TRANSITORIO (dueDate ausente/invalido no payload): uma unica
        // consulta pontual prova o ciclo antes de decidir entre recusar de vez
        // e pedir reentrega.
        const detalhe = payment?.id ? await asaas.getPayment(payment.id) : null;

        pagamento = {
          ...payment,
          dueDate: detalhe?.dueDate ?? payment?.dueDate ?? null,
          value: detalhe?.value ?? payment?.value ?? null,
        };

        avaliacao = decidirCreditoPagamento(
          event,
          pagamento,
          contextoPagamento,
        );

        if (!avaliacao.processar) {
          if (avaliacao.tipo === "definitivo") {
            console.warn(
              `[Webhook] Pagamento recusado (empresa ${empresa.id}): ${avaliacao.motivo}`,
            );
            return NextResponse.json({ message: "Pagamento recusado" });
          }
          // Nem o Asaas provou o ciclo: 500 para reentrega, sem gravar nada
          // (nem credito, nem `webhookEventId`).
          console.error(
            `[Webhook] PAYMENT_RECEIVED sem dueDate confirmado (empresa ${empresa.id}, payment ${payment?.id})`,
          );
          return NextResponse.json(
            { error: "Pagamento sem dueDate" },
            { status: 500 },
          );
        }
      }

      // Cobertura = vencimento da FATURA paga + 1 ciclo. Idempotente sem coluna
      // nova: so avanca se for estritamente maior, entao replay e reentrega
      // fora de ordem do MESMO pagamento recalculam a mesma data e nao avancam
      // duas vezes.
      const alvo = calcularVencimentoCobertura(pagamento?.dueDate);

      if (!alvo) {
        console.error(
          `[Webhook] PAYMENT_RECEIVED sem dueDate (empresa ${empresa.id}, payment ${pagamento?.id}) - cobertura NAO aplicada`,
        );
        return NextResponse.json({ message: "Pagamento sem dueDate ignorado" });
      }

      const aplicavel = avancarVencimentoSeMaior(empresa.vencimentoPlano, alvo);
      if (!aplicavel) {
        // Cobertura ja vigente: nenhum credito novo, mas o beneficio MGM e
        // reconciliado — e por aqui que o retry fecha a pendencia quando o
        // vencimento ja avancou numa entrega anterior.
        const falhasCobertura = await sincronizarBeneficiosCredito(empresa.id);
        if (falhasCobertura.length > 0) {
          return respostaBeneficioPendente(empresa.id, falhasCobertura);
        }
        return NextResponse.json({ message: "Cobertura ja vigente" });
      }

      // ========== CREDITO ATOMICO (plano + recompensa) ==========
      // Plano e recompensa na MESMA transacao: se a recompensa falhar, o
      // pagamento NAO fica marcado e o retry do Asaas reprocessa. O claim
      // condicional (vencimento menor que o alvo) garante no maximo um credito
      // por cobertura, mesmo com eventos duplicados/concorrentes.
      await prisma.$transaction(async (tx) => {
        const claim = await tx.empresa.updateMany({
          where: {
            id: empresa.id,
            OR: [
              { vencimentoPlano: null },
              { vencimentoPlano: { lt: aplicavel } },
            ],
          },
          data: {
            status: "ATIVO",
            vencimentoPlano: aplicavel,
            webhookEventId: eventId,
          },
        });

        if (claim.count !== 1) return;

        await aplicarRecompensaIndicacao(tx, empresa.id);
      });

      // ========== EFEITOS EXTERNOS (Asaas) POS-COMMIT ==========
      // O direito ja esta persistido (o vencimento local inclui o mes gratis; o
      // desconto e derivado das conversoes pagas). Se o Asaas falhar, devolvemos
      // 500 para o Asaas reentregar: o alinhamento e idempotente e refeito nos
      // caminhos de reentrega acima.
      const falhas = await sincronizarBeneficiosCredito(empresa.id);

      if (falhas.length > 0) {
        return respostaBeneficioPendente(empresa.id, falhas);
      }
    } else if (event === "PAYMENT_CONFIRMED") {
      // Sem credito: aguarda PAYMENT_RECEIVED. Nao grava status, vencimento,
      // desconto nem recompensa.
      console.log(
        `[Webhook] PAYMENT_CONFIRMED ignorado para credito (empresa ${empresa.id})`,
      );
    } else if (event === "PAYMENT_OVERDUE") {
      // Cobertura efetiva = o que ja foi pago (`vencimentoPlano`). Reentrega de
      // evento de CICLO ANTIGO (fatura vencida antes da cobertura paga) nao pode
      // pausar quem esta em dia: so olha o atraso da cobertura mais recente.
      const due = payment?.dueDate ? new Date(payment.dueDate) : null;
      const venc = empresa.vencimentoPlano
        ? new Date(empresa.vencimentoPlano)
        : null;
      const valido = (d: Date | null): d is Date =>
        d !== null && !Number.isNaN(d.getTime());

      const cicloJaCoberto =
        valido(due) && valido(venc) && due.getTime() < venc.getTime();

      let pausou = false;
      if (!cicloJaCoberto) {
        const referencia = valido(due) && valido(venc)
          ? new Date(Math.max(due.getTime(), venc.getTime()))
          : valido(due)
            ? due
            : venc;

        if (referencia) {
          const diasAtraso = calcularDiasAtraso(referencia);
          if (deveBloquearPorAtraso(diasAtraso, GRACE_PERIOD_DAYS)) {
            pausou = true;
            await prisma.empresa.update({
              where: { id: empresa.id },
              data: { status: "PAUSADO", webhookEventId: eventId },
            });
          }
        }
      }

      if (!pausou) {
        await prisma.empresa.update({
          where: { id: empresa.id },
          data: { webhookEventId: eventId },
        });
      }
    } else if (
      event === "SUBSCRIPTION_DELETED" ||
      event === "SUBSCRIPTION_INACTIVATED"
    ) {
      await prisma.empresa.update({
        where: { id: empresa.id },
        data: { status: "CANCELADO", webhookEventId: eventId },
      });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[Webhook] Erro ao processar:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
