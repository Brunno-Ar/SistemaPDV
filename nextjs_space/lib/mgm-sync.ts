import { prisma } from "@/lib/db";
import { asaas } from "@/lib/asaas";
import {
  MARCO_MES_GRATIS,
  sincronizarBeneficiosAssinatura,
} from "@/lib/fidelidade";

/**
 * Reconcilia mês grátis (vencimento) e desconto 50% (valor) na assinatura Asaas
 * das empresas COM indicação. Sem estado novo: o esperado é derivado de
 * `MemberConversion` (pagas / mesGratisGerado) e de `Empresa.vencimentoPlano`.
 *
 * Idempotente e monotônica: só empurra `nextDueDate` para frente e só reduz o
 * valor da assinatura (cobranças futuras). Repetir é no-op, então falha do Asaas
 * é recuperada no retry do webhook, no próximo RECEIVED ou em `sync-all`.
 */
export async function sincronizarBeneficiosEmpresa(
  empresaId: string,
): Promise<string[]> {
  const link = await prisma.memberLink.findUnique({
    where: { empresaId },
    select: { id: true },
  });
  if (!link) return [];

  const [pagas, mesesGratisGerados, emp] = await Promise.all([
    prisma.memberConversion.count({
      where: { linkId: link.id, status: "PAGO" },
    }),
    prisma.memberConversion.count({
      where: { linkId: link.id, status: "PAGO", mesGratisGerado: true },
    }),
    prisma.empresa.findUnique({
      where: { id: empresaId },
      select: { asaasSubscriptionId: true, vencimentoPlano: true },
    }),
  ]);

  if (!emp?.asaasSubscriptionId) return [];
  if (pagas < MARCO_MES_GRATIS && mesesGratisGerados === 0) return [];

  const subscriptionId = emp.asaasSubscriptionId;

  try {
    const { falhas } = await sincronizarBeneficiosAssinatura({
      lerEstado: async () => ({
        pagas,
        mesesGratisGerados,
        vencimentoPlano: emp.vencimentoPlano,
      }),
      lerAssinatura: async () => {
        const sub = await asaas.getSubscription(subscriptionId);
        return { nextDueDate: sub.nextDueDate, value: sub.value };
      },
      adiarAssinatura: (novoVencimento) =>
        asaas.updateSubscriptionDueDate(subscriptionId, novoVencimento),
      atualizarValor: (novoValor) =>
        asaas.updateSubscriptionValue(subscriptionId, novoValor),
    });
    return falhas;
  } catch (e) {
    return [e instanceof Error ? e.message : String(e)];
  }
}

/**
 * Reconcilia os beneficios de UM credito: a empresa convertida e, quando o
 * cadastro veio de indicacao, o indicador do link.
 *
 * Existe porque a sincronizacao com o Asaas e pos-commit: se ela falhar, o
 * credito ja esta persistido e a reentrega do Asaas cai nos caminhos
 * idempotentes. Eles precisam reexecutar esta funcao — sem isso a falha do
 * Asaas vira pendencia permanente.
 */
export async function sincronizarBeneficiosCredito(
  empresaId: string,
): Promise<string[]> {
  const falhas = await sincronizarBeneficiosEmpresa(empresaId);

  const conversao = await prisma.memberConversion.findUnique({
    where: { novaEmpresaId: empresaId },
    select: { link: { select: { empresaId: true } } },
  });
  const indicadorId = conversao?.link?.empresaId;

  if (indicadorId) {
    falhas.push(...(await sincronizarBeneficiosEmpresa(indicadorId)));
  }

  return falhas;
}
