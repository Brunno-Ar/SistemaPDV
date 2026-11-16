import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { asaas } from "@/lib/asaas";
import { decidirStatusSincronizado } from "@/lib/access";
import {
  conferirPagamentoConfirmado,
  avancarVencimentoSeMaior,
  coberturaComprovada,
} from "@/lib/pagamento";
import { sincronizarBeneficiosEmpresa } from "@/lib/mgm-sync";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Permitir execuções mais longas (Vercel/Next.js)

/**
 * Sincronizacao em lote das empresas JA VINCULADAS ao Asaas.
 *
 * Limites deliberados (contrato master):
 *  - NAO provisiona: empresa sem `asaasSubscriptionId` volta como `sem_cadastro`
 *    e nada e criado. Provisionamento tem endpoint proprio (preview/confirm).
 *  - NAO cancela terminal em lote: `CANCELLED/CANCELED` no Asaas vira pendencia
 *    de confirmacao explicita, nunca `CANCELADO` silencioso. `INACTIVE` pausa.
 *  - Nao escreve `plano`: o lote nao e lugar de mexer em plano.
 */
export async function POST() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "master") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const empresas = await prisma.empresa.findMany({
      select: {
        id: true,
        nome: true,
        asaasSubscriptionId: true,
        asaasCustomerId: true,
        status: true,
        vencimentoPlano: true,
      },
    });

    const vinculadas = empresas.filter((e) => Boolean(e.asaasSubscriptionId));
    const semCadastro = empresas.filter((e) => !e.asaasSubscriptionId);

    console.log(
      `🔄 Sincronizando ${vinculadas.length} empresas vinculadas; ` +
        `${semCadastro.length} sem cadastro no Asaas (nao provisionadas).`,
    );

    let updatedCount = 0;
    let errorCount = 0;
    let pendentesCount = 0;
    let atingiuTimeout = false;
    const inicio = Date.now();
    const DEADLINE_MS = 45_000;
    const details: {
      empresa: string;
      status: string;
      oldStatus?: string;
      newStatus?: string;
      error?: string;
      pendencia?: string;
    }[] = semCadastro.map((empresa) => ({
      empresa: empresa.nome,
      status: "sem_cadastro",
    }));

    // Serial de proposito: rate limit do Asaas.
    for (const empresa of vinculadas) {
      if (Date.now() - inicio > DEADLINE_MS) {
        atingiuTimeout = true;
        pendentesCount++;
        details.push({
          empresa: empresa.nome,
          status: "pending",
          pendencia: "Limite de tempo (45s) atingido: sincronizacao parcial",
        });
        continue;
      }

      const subscriptionId = empresa.asaasSubscriptionId;
      if (!subscriptionId) continue;

      try {
        const sub = await asaas.getSubscription(subscriptionId);
        const statusAsaas = sub.status ?? "";
        const terminal =
          statusAsaas.toUpperCase() === "CANCELLED" ||
          statusAsaas.toUpperCase() === "CANCELED";

        // Cobertura NUNCA vem de `sub.nextDueDate`: o campo existe mesmo para
        // cobranca NAO paga. A unica prova aceita e historico RECEIVED
        // vinculado ao cliente/assinatura. `null` = Asaas indisponivel.
        const historico = await asaas.listPaymentHistory(subscriptionId);

        const customerId = empresa.asaasCustomerId ?? sub.customerId ?? null;

        const conferencia = await conferirPagamentoConfirmado(
          {
            asaasCustomerId: customerId,
            asaasSubscriptionId: subscriptionId,
            vencimentoPlano: empresa.vencimentoPlano,
          },
          async () => historico,
        );

        const cobertura = coberturaComprovada(historico, {
          customerId,
          subscriptionId,
        });

        // Terminal nao e aplicado em lote: mantem o status atual e sinaliza.
        const novoStatus = terminal
          ? empresa.status
          : decidirStatusSincronizado(
              empresa.status,
              statusAsaas,
              cobertura ?? empresa.vencimentoPlano,
              new Date(),
              conferencia.confirmado,
              { confirmarTerminal: false },
            );

        const vencAvancado = avancarVencimentoSeMaior(
          empresa.vencimentoPlano,
          cobertura,
        );

        await prisma.empresa.update({
          where: { id: empresa.id },
          data: {
            status: novoStatus,
            ...(vencAvancado ? { vencimentoPlano: vencAvancado } : {}),
            // Recupera o vinculo quando o GET /subscriptions devolve `customer`.
            ...(!empresa.asaasCustomerId && sub.customerId
              ? { asaasCustomerId: sub.customerId }
              : {}),
          },
        });

        // Recuperacao de beneficios MGM pendentes no Asaas (idempotente).
        const falhasMgm = await sincronizarBeneficiosEmpresa(empresa.id);
        if (falhasMgm.length > 0) {
          console.warn(
            `[sync-all] Beneficios MGM pendentes em ${empresa.nome}:`,
            falhasMgm,
          );
        }

        // Entrada incompleta (historico indisponivel) e PENDENCIA, nao erro:
        // registra e segue o lote sem promover nem estender.
        if (terminal) {
          pendentesCount++;
          details.push({
            empresa: empresa.nome,
            status: "pending",
            oldStatus: empresa.status,
            newStatus: empresa.status,
            pendencia:
              "Assinatura cancelada no Asaas: cancelamento terminal exige confirmacao",
          });
        } else if (conferencia.pendente) {
          pendentesCount++;
          details.push({
            empresa: empresa.nome,
            status: "pending",
            oldStatus: empresa.status,
            newStatus: novoStatus,
            pendencia: "Historico do Asaas indisponivel",
          });
        } else {
          updatedCount++;
          details.push({
            empresa: empresa.nome,
            status: "success",
            oldStatus: empresa.status,
            newStatus: novoStatus,
          });
        }

        await new Promise((resolve) => setTimeout(resolve, 200));
      } catch (err) {
        console.error(`❌ Falha ao sincronizar empresa ${empresa.nome}:`, err);
        errorCount++;
        details.push({
          empresa: empresa.nome,
          status: "error",
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    console.log(
      `✅ Sincronização concluída. Sucesso: ${updatedCount}, Pendentes: ${pendentesCount}, Erros: ${errorCount}`,
    );

    return NextResponse.json({
      success: true,
      total: empresas.length,
      vinculadas: vinculadas.length,
      semCadastro: semCadastro.length,
      updated: updatedCount,
      pendentes: pendentesCount,
      errors: errorCount,
      ...(atingiuTimeout ? { timeout: true, parcial: true } : {}),
      details,
    });
  } catch (error) {
    console.error("❌ Erro fatal na sincronização em massa:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
