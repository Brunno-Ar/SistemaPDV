"use server";

import { prisma } from "@/lib/db";
import { asaas } from "@/lib/asaas";

export async function getEmpresasComAssinatura() {
  try {
    const empresas = await prisma.empresa.findMany({
      where: {
        asaasSubscriptionId: {
          not: null,
        },
      },
      select: {
        id: true,
        nome: true,
        asaasSubscriptionId: true,
        cpfCnpj: true,
        status: true,
        _count: {
          select: {
            indicados: {
              where: {
                status: "PAGO",
              },
            },
          },
        },
      },
      orderBy: {
        nome: "asc",
      },
    });

    return empresas.map((empresa) => ({
      ...empresa,
      asaasSubscriptionId: empresa.asaasSubscriptionId as string,
      indicadosPagos: empresa._count.indicados,
    }));
  } catch (error) {
    console.error("Erro ao buscar empresas:", error);
    throw new Error("Erro ao buscar empresas");
  }
}

export async function getValorAssinatura(subscriptionId: string) {
  try {
    const subscription = await asaas.getSubscription(subscriptionId);
    return {
      value: subscription.value,
      status: subscription.status,
      cycle: subscription.cycle,
    };
  } catch (error) {
    console.error("Erro ao buscar valor da assinatura no Asaas:", error);
    throw new Error("Erro ao buscar valor da assinatura");
  }
}

export async function atualizarValorAssinatura(
  subscriptionId: string,
  novoValor: number,
) {
  try {
    if (novoValor <= 0) {
      throw new Error("O valor deve ser maior que zero.");
    }

    // Atualiza o valor no Asaas
    await asaas.updateSubscriptionValue(subscriptionId, novoValor);

    return { success: true };
  } catch (error) {
    console.error("Erro ao atualizar valor da assinatura:", error);
    throw new Error("Erro ao atualizar valor da assinatura no Asaas.");
  }
}
