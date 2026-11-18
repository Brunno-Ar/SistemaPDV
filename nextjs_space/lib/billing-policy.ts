/**
 * Fonte unica dos prazos de trial/cobranca do FlowPDV.
 *
 * Usada por: policy de acesso (lib/access), signup (vencimento local) e Asaas
 * (primeira cobranca). Ter um arquivo so evita a divergencia historica entre o
 * vencimento gravado no banco e a data da 1a cobranca no Asaas.
 *
 * TRIAL_DAYS vem de NEXT_PUBLIC_TRIAL_DAYS (env), com fallback 14.
 *  - TRIAL_TOLERANCE_DAYS = 0  (acesso encerra no dia exato do fim do trial, sem tolerância)
 *  - OVERDUE_GRACE_DAYS = 0   (cobrança regular bloqueia no dia exato do vencimento, sem tolerância)
 */

export const TRIAL_DAYS =
  Number(process.env.NEXT_PUBLIC_TRIAL_DAYS) || 14;
export const TRIAL_TOLERANCE_DAYS = 0;
export const OVERDUE_GRACE_DAYS = 0;

export const FUSO_SAO_PAULO = "America/Sao_Paulo";
export const DIA_MS = 24 * 60 * 60 * 1000;

export interface DataCalendario {
  ano: number;
  mes: number;
  dia: number;
  iso: string; // YYYY-MM-DD
}

/**
 * Extrai a data civil (ano, mês, dia) considerando convenção de data civil
 * (strings YYYY-MM-DD ou datas instanciadas à meia-noite UTC) e o fuso
 * America/Sao_Paulo para timestamps com horário real.
 */
export function extrairDataCalendario(
  valor: string | Date | null | undefined,
  fuso: string = FUSO_SAO_PAULO,
): DataCalendario | null {
  if (!valor) return null;

  // Se for string YYYY-MM-DD direta ou prefixo de ISO com T00:00:00
  if (typeof valor === "string") {
    const match = valor.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match && (valor.length === 10 || valor.includes("T00:00:00"))) {
      const ano = Number(match[1]);
      const mes = Number(match[2]);
      const dia = Number(match[3]);
      return { ano, mes, dia, iso: `${match[1]}-${match[2]}-${match[3]}` };
    }
  }

  const d = valor instanceof Date ? valor : new Date(valor);
  if (Number.isNaN(d.getTime())) return null;

  // Date instanciado exatamente à meia-noite UTC (ex.: new Date("2026-11-18T00:00:00.000Z")
  // ou new Date("2026-11-18"), formato padrão do Prisma para campos DateTime de vencimento)
  if (
    d.getUTCHours() === 0 &&
    d.getUTCMinutes() === 0 &&
    d.getUTCSeconds() === 0 &&
    d.getUTCMilliseconds() === 0
  ) {
    const ano = d.getUTCFullYear();
    const mes = d.getUTCMonth() + 1;
    const dia = d.getUTCDate();
    const iso = `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
    return { ano, mes, dia, iso };
  }

  // Timestamp com horário real: projeta no fuso America/Sao_Paulo
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: fuso,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const iso = fmt.format(d);
  const [ano, mes, dia] = iso.split("-").map(Number);
  return { ano, mes, dia, iso };
}

/**
 * Calcula o instante exato do corte de acesso:
 * 23:59:59.999 no fuso America/Sao_Paulo (UTC-3).
 * No fuso de Brasília permanente (UTC-3), 23:59:59.999 corresponde a 02:59:59.999 UTC
 * do dia civil seguinte.
 * Tolerâncias adicionais somam dias inteiros além desse fim de dia.
 */
export function obterLimiteVencimentoSaoPaulo(
  valor: string | Date | null | undefined,
  toleranciaDias: number = 0,
): Date | null {
  const data = extrairDataCalendario(valor);
  if (!data) return null;

  // 23:59:59.999 em America/Sao_Paulo (UTC-3 = +3h em UTC)
  const baseUtcMs =
    Date.UTC(data.ano, data.mes - 1, data.dia, 23, 59, 59, 999) +
    3 * 60 * 60 * 1000 +
    toleranciaDias * DIA_MS;

  return new Date(baseUtcMs);
}

/**
 * Limite EXCLUSIVO de uma data civil no fuso America/Sao_Paulo: 00:00:00.000
 * do dia seguinte (UTC-3 ⇒ 03:00:00.000Z).
 *
 * Serve para campos comparados com `>` (ex.: `liberacaoTemporariaAte`), onde o
 * valor gravado é o primeiro instante JÁ bloqueado. Com este limite o acesso
 * vale até 23:59:59.999 de São Paulo do dia informado, inclusive.
 */
export function obterLimiteExclusivoSaoPaulo(
  valor: string | Date | null | undefined,
  diasAdicionais: number = 0,
): Date | null {
  const data = extrairDataCalendario(valor);
  if (!data) return null;

  return new Date(
    Date.UTC(data.ano, data.mes - 1, data.dia + 1 + diasAdicionais, 3, 0, 0, 0),
  );
}

/**
 * Retorna a meia-noite UTC correspondente ao início do dia civil atual
 * no fuso America/Sao_Paulo (UTC-3).
 * Usado por rotinas de cron para que o corte só alcance empresas cujo
 * vencimento pertencia a um dia civil estritamente anterior ao dia corrente em SP.
 */
export function calcularInicioDiaCivilSaoPaulo(agora: Date = new Date()): Date {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: FUSO_SAO_PAULO,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const iso = fmt.format(agora);
  const [ano, mes, dia] = iso.split("-").map(Number);
  return new Date(Date.UTC(ano, mes - 1, dia, 0, 0, 0, 0));
}

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
 * Dias civis de atraso entre o vencimento e agora no fuso America/Sao_Paulo.
 * Retorna 0 no dia do vencimento (acesso segue liberado até 23:59:59).
 * Retorna 1 a partir de 00:00 do dia seguinte.
 * Retorna valores negativos se a data atual for anterior ao vencimento.
 */
export function calcularDiasAtraso(
  dueDate: string | Date | null | undefined,
  agora: string | Date = new Date(),
): number {
  if (!dueDate) return 0;
  const dataVenc = extrairDataCalendario(dueDate);
  if (!dataVenc) return 0;
  const dataAgora = extrairDataCalendario(agora);
  if (!dataAgora) return 0;

  const utcVenc = Date.UTC(dataVenc.ano, dataVenc.mes - 1, dataVenc.dia);
  const utcAgora = Date.UTC(dataAgora.ano, dataAgora.mes - 1, dataAgora.dia);

  return Math.round((utcAgora - utcVenc) / DIA_MS);
}

/**
 * Decide se o atraso já passou da tolerância de cobrança regular.
 * Com OVERDUE_GRACE_DAYS = 0 (zero tolerância adicional):
 * - diasAtraso <= 0 (dia do vencimento ou antes): false (acesso liberado até 23:59:59)
 * - diasAtraso > 0 (a partir de 00:00 do dia seguinte): true (bloqueado imediatamente)
 */
export function deveBloquearPorAtraso(
  diasAtraso: number,
  graceDias: number = OVERDUE_GRACE_DAYS,
): boolean {
  if (diasAtraso <= 0) return false;
  return diasAtraso > graceDias;
}
