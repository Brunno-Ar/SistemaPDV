/**
 * Autoriza chamada de cron.
 *
 * Falha FECHADA: se CRON_SECRET estiver ausente ou vazio, nada autoriza. Sem
 * isso, a comparacao ingenua `header !== "Bearer " + undefined` aceitaria
 * "Bearer undefined" ou "Bearer " (header vazio) quando a env nao esta definida.
 *
 * Comparacao em tempo constante (sem `crypto` do Node, para rodar tambem no
 * ambiente de teste jsdom).
 */
function iguaisTempoConstante(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export function autorizarCron(
  authHeader: string | null | undefined,
  secret: string | null | undefined,
): boolean {
  if (!secret) return false;
  return iguaisTempoConstante(authHeader ?? "", `Bearer ${secret}`);
}
