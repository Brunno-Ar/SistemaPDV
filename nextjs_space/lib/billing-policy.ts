/**
 * Fonte unica dos prazos de trial/cobranca do FlowPDV.
 *
 * Usada por: policy de acesso (lib/access), signup (vencimento local) e Asaas
 * (primeira cobranca). Ter um arquivo so evita a divergencia historica entre o
 * vencimento gravado no banco e a data da 1a cobranca no Asaas.
 *
 * Valores confirmados pelo usuario:
 *  - TRIAL_DAYS = 14           (trial oficial)
 *  - TRIAL_TOLERANCE_DAYS = 1  (acesso segue ativo ate 1 dia apos o fim do trial)
 *  - OVERDUE_GRACE_DAYS = 10   (cobranca regular bloqueia 10 dias apos o vencimento)
 */

export const TRIAL_DAYS = 14;
export const TRIAL_TOLERANCE_DAYS = 1;
export const OVERDUE_GRACE_DAYS = 10;

/**
 * Preco mensal base EXATO (fonte unica). 50% = R$24,95.
 * Nao vem de env: uma NEXT_PUBLIC_PLAN_PRICE divergente mudaria a cobranca e a
 * validacao de valor em silencio.
 */
export const PRECO_PLANO_PADRAO = 49.9;

/**
 * Desconto maximo publicado (fidelidade, marco 5): 50%.
 * Serve de piso para validar pagamento recebido: nada abaixo disso e cobranca
 * legitima da assinatura (R$0,01 nao libera plano de R$49,90).
 */
export const DESCONTO_MAXIMO = 0.5;

/** Piso aceitavel de um pagamento recebido = valor cheio com o desconto maximo. */
export const VALOR_MINIMO_PAGAMENTO =
  Math.round(PRECO_PLANO_PADRAO * (1 - DESCONTO_MAXIMO) * 100) / 100;

/**
 * Retencao de conta sem uso: so fica elegivel a expurgo 90 dias apos o fim do
 * trial + tolerancia. Politica confirmada pelo usuario; nao ler de env.
 */
export const PURGE_INACTIVE_DAYS = 90;

/**
 * Fim do trial: base + TRIAL_DAYS. Mesma duracao para o vencimento local
 * (signup) e para a 1a cobranca (Asaas), por construcao.
 */
export function calcularVencimentoTrial(
  base: Date = new Date(),
  dias: number = TRIAL_DAYS,
): Date {
  const data = new Date(base);
  data.setDate(data.getDate() + dias);
  return data;
}

/**
 * Dias de atraso (inteiro) entre o vencimento e agora. 0 se nao houver
 * vencimento valido. Fonte unica para o webhook e o cron nao divergirem.
 */
export function calcularDiasAtraso(
  dueDate: string | Date | null | undefined,
  agora: Date = new Date(),
): number {
  if (!dueDate) return 0;
  const venc = new Date(dueDate);
  if (Number.isNaN(venc.getTime())) return 0;
  return Math.floor((agora.getTime() - venc.getTime()) / (24 * 60 * 60 * 1000));
}

/**
 * Decide se o atraso ja passou da tolerancia de cobranca regular.
 * O limite NAO vem de env: e a politica unica (OVERDUE_GRACE_DAYS), para que
 * uma variavel ASAAS_GRACE_PERIOD_DAYS divergente nao sobrescreva a regra.
 */
export function deveBloquearPorAtraso(
  diasAtraso: number,
  graceDias: number = OVERDUE_GRACE_DAYS,
): boolean {
  return diasAtraso >= graceDias;
}
