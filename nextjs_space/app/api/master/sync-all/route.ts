import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { asaas } from "@/lib/asaas";

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
        status: true,
      },
    });

    console.log(
      `🔄 Iniciando sincronização em massa para ${empresas.length} empresas...`
    );

    let updatedCount = 0;
    let errorCount = 0;
    const details: any[] = [];

    // 2. Iterar e atualizar (serialmente para evitar rate limit agressivo)
    for (const empresa of empresas) {
      if (!empresa.asaasSubscriptionId) continue;

      try {
        const sub = await asaas.getSubscription(empresa.asaasSubscriptionId);

        // Mapear status do Asaas para o sistema local
        let novoStatus = empresa.status;
        let novoVencimento = sub.nextDueDate ? new Date(sub.nextDueDate) : null;

        if (sub.status === "ACTIVE") novoStatus = "ATIVO";
        else if (sub.status === "OVERDUE")
          novoStatus =
            "PAUSADO"; // Ou manter ATIVO se dentro do grace period (mas aqui forçamos o status real)
        else if (sub.status === "RECEIVED" || sub.status === "CONFIRMED")
          novoStatus = "ATIVO";
        else if (sub.status === "INACTIVE" || sub.status === "CANCELLED")
          novoStatus = "CANCELADO";

        // Se estiver EM_TESTE, mantemos EM_TESTE até que o pagamento seja confirmado ou vença
        if (
          empresa.status === "EM_TESTE" &&
          novoStatus !== "ATIVO" &&
          novoStatus !== "CANCELADO"
        ) {
          // Verifica se o trial expirou
          if (novoVencimento && new Date() > novoVencimento) {
            novoStatus = "PAUSADO"; // Fim do trial sem pagamento
          } else {
            novoStatus = "EM_TESTE"; // Ainda no trial
          }
        }

        // Atualizar no banco
        await prisma.empresa.update({
          where: { id: empresa.id },
          data: {
            status: novoStatus,
            vencimentoPlano: novoVencimento,
            plano: "PRO", // Garantir que tenha um plano setado
            asaasCustomerId: sub.customer, // Atualizar customer ID se necessário
          },
        });

        updatedCount++;
        details.push({
          empresa: empresa.nome,
          status: "success",
          oldStatus: empresa.status,
          newStatus: novoStatus,
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
      `✅ Sincronização concluída. Sucesso: ${updatedCount}, Erros: ${errorCount}`
    );

    return NextResponse.json({
      success: true,
      total: empresas.length,
      updated: updatedCount,
      errors: errorCount,
      details,
    });
  } catch (error) {
    console.error("❌ Erro fatal na sincronização em massa:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
