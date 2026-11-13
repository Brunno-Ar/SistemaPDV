import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { asaas } from "@/lib/asaas";
import { decidirStatusSincronizado } from "@/lib/access";
import { conferirPagamentoConfirmado, avancarVencimentoSeMaior, coberturaComprovada } from "@/lib/pagamento";
import { sincronizarBeneficiosEmpresa } from "@/lib/mgm-sync";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Permitir execuções mais longas (Vercel/Next.js)

export async function POST() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "master") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 1. Buscar todas as empresas com assinatura vinculada
    const empresas = await prisma.empresa.findMany({
      where: {
        asaasSubscriptionId: { not: null },
      },
      select: {
        id: true,
        nome: true,
        asaasSubscriptionId: true,
        asaasCustomerId: true,
        status: true,
        vencimentoPlano: true,
      },
    });

    console.log(
      `🔄 Iniciando sincronização em massa para ${empresas.length} empresas...`,
    );

    let updatedCount = 0;
    let errorCount = 0;
    let pendentesCount = 0;
    const details: {
      empresa: string;
      status: string;
      oldStatus?: string;
      newStatus?: string;
      error?: string;
      pendencia?: string;
    }[] = [];

    // 2. Iterar e atualizar (serialmente para evitar rate limit agressivo)
    for (const empresa of empresas) {
      if (!empresa.asaasSubscriptionId) continue;

      try {
        const sub = await asaas.getSubscription(empresa.asaasSubscriptionId);

        // Cobertura NUNCA vem de `sub.nextDueDate`: o campo existe mesmo para
        // cobranca NAO paga. A unica prova aceita e historico RECEIVED
        // vinculado ao cliente/assinatura. `null` = Asaas indisponivel.
        const historico = await asaas.listPaymentHistory(
          empresa.asaasSubscriptionId,
        );

        // Prova server-side de PAYMENT_RECEIVED: estado local gravado pelo
        // webhook ou historico do Asaas (RECEIVED vinculado e cobrindo o ciclo
        // atual). CONFIRMED nao conta. Falha FECHADA: sem prova, o status NAO
        // sobe para ATIVO e o vencimento local NAO avanca.
        const conferencia = await conferirPagamentoConfirmado(
          {
            asaasCustomerId: empresa.asaasCustomerId,
            asaasSubscriptionId: empresa.asaasSubscriptionId,
            vencimentoPlano: empresa.vencimentoPlano,
          },
          async () => historico,
        );

        // Cobertura comprovada por RECEIVED (dueDate + 1 ciclo). Entrada
        // incompleta e ignorada; sem prova, nada avanca.
        const cobertura = coberturaComprovada(historico, {
          customerId: empresa.asaasCustomerId,
          subscriptionId: empresa.asaasSubscriptionId,
        });

        // Decisao de status pela policy UNICA (tolerancia trial +1d / plano
        // +10d). NAO pausa no vencimento cru do Asaas, NAO ativa em CONFIRMED e
        // so promove para ATIVO com pagamento RECEIVED comprovado.
        const novoStatus = decidirStatusSincronizado(
          empresa.status,
          sub.status,
          cobertura ?? empresa.vencimentoPlano,
          new Date(),
          conferencia.confirmado,
        );

        // Vencimento local SO avanca com pagamento RECEIVED comprovado — e
        // apenas para frente: nunca encolhe o mes gratis ja concedido (MGM).
        const vencAvancado = avancarVencimentoSeMaior(
          empresa.vencimentoPlano,
          cobertura,
        );

        await prisma.empresa.update({
          where: { id: empresa.id },
          data: {
            status: novoStatus,
            ...(vencAvancado ? { vencimentoPlano: vencAvancado } : {}),
            plano: "PRO", // Garantir que tenha um plano setado
            asaasCustomerId: sub.customerId, // Atualizar customer ID se necessário
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
        if (conferencia.pendente) pendentesCount++;
        else updatedCount++;

        details.push({
          empresa: empresa.nome,
          status: conferencia.pendente ? "pending" : "success",
          oldStatus: empresa.status,
          newStatus: novoStatus,
          ...(conferencia.pendente
            ? { pendencia: "Historico do Asaas indisponivel" }
            : {}),
        });
        // Pequeno delay para ser gentil com a API
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
      updated: updatedCount,
      pendentes: pendentesCount,
      errors: errorCount,
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
