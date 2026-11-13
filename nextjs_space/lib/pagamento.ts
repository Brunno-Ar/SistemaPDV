/**
 * Validacao e idempotencia de eventos de pagamento (webhook Asaas).
 *
 * DEDUCAO DE CREDITO (decisao do usuario):
 *  - SO `PAYMENT_RECEIVED` credita plano/referral, porque so nele o valor esta
 *    disponivel. `PAYMENT_CONFIRMED` NAO credita: boleto/cartao podem emitir
 *    CONFIRMED antes de RECEIVED (cartao pode aguardar ~32 dias).
 *  - Idempotencia SEM coluna nova: a cobertura do plano e derivada de
 *    `payment.dueDate` e avanca de forma monotona (`avancarVencimentoSeMaior`),
 *    entao retries e 2 event ids para o mesmo pagamento nao creditam 2x.
 *
 * VALOR: recusa ausente/invalido/<= 0 e tambem SUBPAGAMENTO (abaixo do piso
 * `VALOR_MINIMO_PAGAMENTO` = preco base com o desconto maximo, R$24,95). Valor
 * ACIMA continua aceito: juros/multa de pagamento atrasado sao legitimos.
 *
 * IDEMPOTENCIA: derivada de `payment.dueDate` (cobertura monotona). Sem dueDate
 * nao ha prova de cobertura e o credito e recusado — nunca inventar data, senao
 * retry de pagamento antigo estenderia de novo.
 *
 * Preco base vem de lib/billing-policy (fonte unica; 50% = R$24,95).
 *
 * Funcoes puras (sem Prisma) para rodar no webhook e em teste.
 */

import { PRECO_PLANO_PADRAO, VALOR_MINIMO_PAGAMENTO } from "@/lib/billing-policy";

// Reexportado para manter a API anterior de lib/pagamento.
export { PRECO_PLANO_PADRAO, VALOR_MINIMO_PAGAMENTO };

export const EVENTO_PAGAMENTO_RECEBIDO = "PAYMENT_RECEIVED";

/** So PAYMENT_RECEIVED libera credito de plano/referral. */
export function eventoCreditaPlano(event: string | null | undefined): boolean {
  return event === EVENTO_PAGAMENTO_RECEBIDO;
}

export interface PagamentoAsaas {
  id?: string | null;
  customer?: string | null;
  subscription?: string | null;
  value?: number | null;
  /** Vencimento da fatura paga (YYYY-MM-DD). Prova a cobertura do ciclo. */
  dueDate?: string | null;
}

export interface EmpresaPagamento {
  asaasCustomerId: string | null;
  asaasSubscriptionId: string | null;
}

export type TipoRecusa = "definitivo" | "transitorio";

export type ResultadoPagamento =
  | { processar: true }
  | { processar: false; motivo: string; tipo: TipoRecusa };

/**
 * Decisao de credito do plano SEM coluna de "ultimo pagamento": a idempotencia
 * deixa de ser por payment.id persistido e passa a ser PROVADA pelos dados:
 *  - `avaliarPagamento` valida integridade (customer/subscription/valor);
 *  - o credito de cobertura em si e monotono e derivado de `payment.dueDate`
 *    (ver `calcularVencimentoCobertura`), entao replay/fora-de-ordem do MESMO
 *    pagamento recalcula a mesma data-alvo e nao avanca duas vezes.
 */
export function avaliarPagamento(
  payment: PagamentoAsaas | null | undefined,
  empresa: EmpresaPagamento,
): ResultadoPagamento {
  const paymentId = payment?.id;
  if (!paymentId) {
    return {
      processar: false,
      motivo: "payload sem payment.id",
      tipo: "definitivo",
    };
  }

  if (!payment.customer || payment.customer !== empresa.asaasCustomerId) {
    return {
      processar: false,
      motivo: "customer nao pertence a empresa",
      tipo: "definitivo",
    };
  }

  if (
    payment.subscription &&
    empresa.asaasSubscriptionId &&
    payment.subscription !== empresa.asaasSubscriptionId
  ) {
    return {
      processar: false,
      motivo: "subscription nao pertence a empresa",
      tipo: "definitivo",
    };
  }

  const valor = payment.value;
  if (typeof valor !== "number" || !Number.isFinite(valor) || valor <= 0) {
    return {
      processar: false,
      motivo: "valor de pagamento invalido",
      tipo: "definitivo",
    };
  }

  // Subpagamento: valor tem que cobrir o devido com o maior desconto publicado.
  // Comparacao em centavos para nao brigar com float (24.95 * 100).
  if (Math.round(valor * 100) < Math.round(VALOR_MINIMO_PAGAMENTO * 100)) {
    return {
      processar: false,
      motivo: `valor abaixo do devido (minimo R$${VALOR_MINIMO_PAGAMENTO.toFixed(2)})`,
      tipo: "definitivo",
    };
  }

  // Sem dueDate nao ha prova de qual ciclo foi pago: creditar por fallback
  // ("agora + 1 mes") faria o retry de um pagamento antigo estender de novo.
  // TRANSITORIO: o dado pode faltar no payload e existir no Asaas — quem chama
  // consulta a cobranca uma vez antes de recusar em definitivo.
  if (!payment.dueDate || !calcularVencimentoCobertura(payment.dueDate)) {
    return {
      processar: false,
      motivo: "payload sem dueDate valido",
      tipo: "transitorio",
    };
  }

  return { processar: true };
}

/**
 * Gate completo do credito: evento E pagamento. So PAYMENT_RECEIVED passa do
 * gate; depois roda `avaliarPagamento` (integridade).
 */
export function decidirCreditoPagamento(
  event: string | null | undefined,
  payment: PagamentoAsaas | null | undefined,
  empresa: EmpresaPagamento,
): ResultadoPagamento {
  if (!eventoCreditaPlano(event)) {
    return {
      processar: false,
      motivo: "evento nao credita plano (so PAYMENT_RECEIVED)",
      tipo: "definitivo",
    };
  }
  return avaliarPagamento(payment, empresa);
}

/**
 * Data-limite de cobertura do plano a partir do vencimento da FATURA paga
 * (`payment.dueDate`): um ciclo (mes) alem do vencimento da fatura. Retorna null
 * se o vencimento vier ausente/invalido (fail-closed).
 */
export function calcularVencimentoCobertura(
  dueDate: string | null | undefined,
): Date | null {
  if (!dueDate) return null;
  const inicio = new Date(dueDate);
  if (Number.isNaN(inicio.getTime())) return null;
  const fim = new Date(inicio);
  // Em UTC (o Asaas manda YYYY-MM-DD) e preservando fim de mes:
  // 31/01 + 1 mes -> 28/02.
  const dia = fim.getUTCDate();
  fim.setUTCDate(1);
  fim.setUTCMonth(fim.getUTCMonth() + 1);
  const ultimoDiaDoMes = new Date(
    Date.UTC(fim.getUTCFullYear(), fim.getUTCMonth() + 1, 0),
  ).getUTCDate();
  fim.setUTCDate(Math.min(dia, ultimoDiaDoMes));
  return fim;
}

/**
 * Avanca o vencimento local so quando o alvo e ESTRITAMENTE maior. E isto que
 * torna o credito idempotente sem guardar payment.id: replay do mesmo pagamento
 * (mesma data-alvo) e reentrega fora-de-ordem (alvo anterior) resultam em no-op.
 */
export function avancarVencimentoSeMaior(
  atual: Date | null,
  alvo: Date | null,
): Date | null {
  if (!alvo) return null;
  if (atual && alvo.getTime() <= atual.getTime()) return null;
  return alvo;
}

// =====================================================================
// Confirmacao de pagamento para reativacao MANUAL pelo master.
//
// A acao master nao confia em flag do cliente (body.pagamentoConfirmado).
// Ela confere o pagamento server-side, em duas fontes, nesta ordem:
//   1. ESTADO LOCAL: conta com cobertura vigente (vencimentoPlano futuro) e que
//      nao esteja em trial/pendente — atalho (sem prova por payment.id);
//   2. ASAAS: historico da assinatura com RECEIVED + vinculo + cobertura atual.
// Falha FECHADA: sem fonte confiavel, a acao e recusada.
// =====================================================================

export interface PagamentoHistorico {
  status?: string | null;
  value?: number | null;
  /** Vencimento da fatura paga (YYYY-MM-DD). Prova a cobertura do ciclo. */
  dueDate?: string | null;
  /** Cliente do pagamento no Asaas (prova de vinculo). */
  customer?: string | null;
  /** Assinatura do pagamento no Asaas (prova de vinculo). */
  subscription?: string | null;
}

/** Contexto exigido para aceitar o historico do Asaas como prova. */
export interface ContextoConfirmacao {
  customerId?: string | null;
  subscriptionId?: string | null;
  agora?: Date;
}

/**
 * Um pagamento RECEBIDO cobre o ciclo aberto pelo proprio vencimento; somamos um
 * ciclo (mes). `dueDate` ausente/invalido nao prova cobertura (fail-closed).
 * Usa `calcularVencimentoCobertura` para preservar fim de mes (31/01 -> 28/02).
 */
function cobreAgora(dueDate: string | null | undefined, agora: Date): boolean {
  const fim = calcularVencimentoCobertura(dueDate);
  return fim !== null && fim.getTime() >= agora.getTime();
}

/**
 * Ha pagamento LIQUIDADO (RECEIVED) que PROVA cobertura do ciclo atual?
 *
 * Fail-closed: so RECEIVED, valor >= piso (nao aceita subpagamento tipo R$0,01),
 * com `dueDate` que ainda cobre agora (impede um recebimento antigo de reativar
 * uma divida posterior) e vinculado a MESMA subscription/customer da empresa.
 * Campo ausente = recusa.
 *
 * Valor ACIMA do piso e aceito (juros/multa de atraso).
 */
export function houveConfirmacaoPagamento(
  historico: PagamentoHistorico[],
  ctx: ContextoConfirmacao = {},
): boolean {
  const agora = ctx.agora ?? new Date();
  return historico.some((p) => {
    const status = (p.status ?? "").toUpperCase();
    if (status !== "RECEIVED") return false;

    const valor = p.value;
    if (typeof valor !== "number" || !Number.isFinite(valor) || valor <= 0) {
      return false;
    }
    // Mesmo piso do webhook: subpagamento nao comprova a mensalidade.
    if (Math.round(valor * 100) < Math.round(VALOR_MINIMO_PAGAMENTO * 100)) {
      return false;
    }

    // Vinculo: o pagamento tem que ser da MESMA assinatura/cliente.
    if (ctx.subscriptionId && p.subscription !== ctx.subscriptionId) {
      return false;
    }
    if (ctx.customerId && p.customer !== ctx.customerId) {
      return false;
    }

    // Cobertura: so vale se o ciclo pago ainda cobre agora.
    return cobreAgora(p.dueDate, agora);
  });
}

/**
 * O estado local comprova pagamento quando ha COBERTURA vigente
 * (`vencimentoPlano` futuro) e a conta nao e de trial/pendente. Sem a coluna
 * `ultimoPagamentoId` (removida), esta e a prova local disponivel — mais fraca
 * que o historico do Asaas, por isso usada so como atalho; a prova forte e o
 * historico RECEIVED+vinculo+cobertura.
 */
export function estadoLocalConfirmaPagamento(
  estado: {
    status?: string | null;
    vencimentoPlano?: string | Date | null;
  },
  agora: Date = new Date(),
): boolean {
  if (estado.status === "EM_TESTE" || estado.status === "PENDENTE") {
    return false;
  }
  if (!estado.vencimentoPlano) return false;
  const venc = new Date(estado.vencimentoPlano);
  if (Number.isNaN(venc.getTime())) return false;
  return venc >= agora;
}

/**
 * Fim de cobertura PROVADO pelo historico do Asaas: maior `dueDate + 1 ciclo`
 * entre os RECEIVED vinculados ao cliente/assinatura com valor >= piso.
 *
 * Entrada incompleta (sem dueDate/valor/vinculo) e simplesmente ignorada — nao
 * inventa prova. `null` (falha do Asaas) ou lista sem prova resulta em `null`.
 * NUNCA derivar cobertura de `subscription.nextDueDate`: esse campo existe
 * mesmo para cobranca nao paga.
 */
export function coberturaComprovada(
  historico: PagamentoHistorico[] | null,
  ctx: ContextoConfirmacao = {},
): Date | null {
  if (!historico) return null;

  let maior: Date | null = null;

  for (const p of historico) {
    if ((p.status ?? "").toUpperCase() !== "RECEIVED") continue;

    const valor = p.value;
    if (typeof valor !== "number" || !Number.isFinite(valor) || valor <= 0) {
      continue;
    }
    if (Math.round(valor * 100) < Math.round(VALOR_MINIMO_PAGAMENTO * 100)) {
      continue;
    }

    if (ctx.subscriptionId && p.subscription !== ctx.subscriptionId) continue;
    if (ctx.customerId && p.customer !== ctx.customerId) continue;

    const fim = calcularVencimentoCobertura(p.dueDate);
    if (!fim) continue;

    if (!maior || fim.getTime() > maior.getTime()) maior = fim;
  }

  return maior;
}

export type FontePagamento = "local" | "asaas" | "nenhuma";

/**
 * Confere pagamento confirmado para uma acao master.
 *
 * `buscarHistorico` e injetado (no app, `asaas.listPaymentHistory`) para manter
 * a funcao testavel sem chamada externa. `null` = falha do Asaas, DIFERENTE de
 * lista vazia: falha vira `pendente: true` (falso negativo, nunca libera).
 */
export async function conferirPagamentoConfirmado(
  empresa: {
    asaasCustomerId?: string | null;
    asaasSubscriptionId: string | null;
    status?: string | null;
    vencimentoPlano?: string | Date | null;
  },
  buscarHistorico: (
    subscriptionId: string,
  ) => Promise<PagamentoHistorico[] | null>,
  agora: Date = new Date(),
): Promise<{ confirmado: boolean; fonte: FontePagamento; pendente: boolean }> {
  if (empresa.asaasSubscriptionId) {
    let historico: PagamentoHistorico[] | null = null;
    try {
      historico = await buscarHistorico(empresa.asaasSubscriptionId);
    } catch {
      // Falha do Asaas nao prova pagamento: falha FECHADA.
      return { confirmado: false, fonte: "nenhuma", pendente: true };
    }

    if (historico === null) {
      return { confirmado: false, fonte: "nenhuma", pendente: true };
    }

    // Exige vinculo (mesma subscription/customer) + cobertura do ciclo atual.
    // Historico sem esses campos nao prova nada -> recusa (fail-closed).
    if (
      houveConfirmacaoPagamento(historico, {
        customerId: empresa.asaasCustomerId ?? null,
        subscriptionId: empresa.asaasSubscriptionId,
        agora,
      })
    ) {
      return { confirmado: true, fonte: "asaas", pendente: false };
    }
  }

  return { confirmado: false, fonte: "nenhuma", pendente: false };
}
