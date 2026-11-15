/**
 * Expurgo de contas inativas (retencao de dados).
 *
 * Politica confirmada pelo usuario: uma conta SEM USO so fica elegivel a
 * expurgo 90 dias apos o fim do trial + tolerancia. Qualquer conta com dado
 * operacional ou relacao financeira (inclusive historico pago) e preservada.
 *
 * Este modulo e PURO/INJETAVEL: nao fala com Prisma nem com o Asaas. Ele decide
 * a elegibilidade e monta o plano (DRY-RUN). Nenhum delete real acontece aqui.
 *
 * Regra de execucao (para quem for executar, fora deste modulo):
 *   1. Uma unica transacao ($transaction) apaga os filhos e por fim a Empresa.
 *   2. SOMENTE APOS o commit cancelar/remover customer/assinatura no Asaas.
 *      Nunca antes: se o Asaas for cancelado e a transacao falhar, a conta fica
 *      no banco sem assinatura. Se o Asaas falhar apos o commit, a conta ja saiu
 *      e a pendencia de Asaas e tratada como reconciliacao (nao desfaz o commit).
 *   3. Nada de anonimizacao: nao existe politica/contador para isso.
 *
 * OBS: elegivel so e decidido com dados de producao coletados pelo chamador.
 * Sem esses dados, o plano e incompleto e NAO pode ser usado para apagar nada.
 */

import { TRIAL_DAYS, TRIAL_TOLERANCE_DAYS, PURGE_INACTIVE_DAYS } from "@/lib/billing-policy";

/** Conta candidata (metadados minimos, sem dados operacionais). */
export interface ContaCandidata {
  empresaId: string;
  nome: string;
  status: string;
  vencimentoPlano: Date | null;
  createdAt: Date;
  asaasCustomerId: string | null;
  asaasSubscriptionId: string | null;
}

/**
 * Evidencias de uso/relacao coletadas pelo chamador (contagens e flags).
 * Qualquer valor > 0 / true PRESERVA a conta.
 */
export interface EvidenciasConta {
  vendas: number;
  itensVenda: number;
  movimentacoesEstoque: number;
  movimentacoesCaixa: number;
  despesas: number;
  notas: number;
  produtos: number;
  lotes: number;
  cancelamentos: number;
  /** MemberLink proprio (indicador) ou MemberConversion onde e o indicado. */
  indicacoes: number;
  /** Ha subscription/customer/cobranca Asaas pendente. */
  asaasPendente: boolean;
  /** Ha QUALQUER pagamento liquidado (historico pago). */
  asaasHistoricoPago: boolean;
  /** Conta piloto/interna, identificada fora de producao (allowlist). */
  pilotoInterno: boolean;
}

export interface OpcoesExpurgo {
  /** Tolerancia pos-trial (dias). Default: politica (TRIAL_TOLERANCE_DAYS). */
  toleranciaDias?: number;
  /** Janela de inatividade (dias). Default: politica (PURGE_INACTIVE_DAYS). */
  diasInatividade?: number;
}

export interface ResultadoElegibilidade {
  elegivel: boolean;
  dataElegibilidade: Date;
  /** Razoes que PRESERVAM a conta. Vazio => elegivel. */
  motivos: string[];
}

function adicionarDias(base: Date, dias: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + dias);
  return d;
}

/**
 * Fim do trial + tolerancia: referencia para a contagem dos dias de inatividade.
 * Usa o vencimento gravado; sem ele (conta PENDENTE), deriva de createdAt.
 */
export function calcularFimTrial(
  conta: Pick<ContaCandidata, "vencimentoPlano" | "createdAt">,
  toleranciaDias: number = TRIAL_TOLERANCE_DAYS,
): Date {
  const fimTrial = conta.vencimentoPlano
    ? new Date(conta.vencimentoPlano)
    : adicionarDias(conta.createdAt, TRIAL_DAYS);
  return adicionarDias(fimTrial, toleranciaDias);
}

/** Data a partir da qual a conta sem uso pode ser expurgada. */
export function calcularDataElegibilidadeExpurgo(
  conta: Pick<ContaCandidata, "vencimentoPlano" | "createdAt">,
  opts: OpcoesExpurgo = {},
): Date {
  const fim = calcularFimTrial(conta, opts.toleranciaDias);
  return adicionarDias(fim, opts.diasInatividade ?? PURGE_INACTIVE_DAYS);
}

/**
 * Decide a elegibilidade. Preserva (NAO elegivel) se houver QUALQUER evidencia
 * operacional/financeira, piloto/interno, conta ativa, ou se ainda nao passaram
 * os 90 dias apos o fim do trial + tolerancia.
 */
export function avaliarElegibilidadeExpurgo(
  conta: ContaCandidata,
  evidencias: EvidenciasConta,
  agora: Date = new Date(),
  opts: OpcoesExpurgo = {},
): ResultadoElegibilidade {
  const motivos: string[] = [];

  if (conta.status === "ATIVO") motivos.push("conta ativa");
  if (evidencias.asaasHistoricoPago) motivos.push("historico pago");
  if (evidencias.asaasPendente) motivos.push("cobranca/assinatura Asaas pendente");
  if (evidencias.pilotoInterno) motivos.push("piloto/interno");

  if (evidencias.vendas > 0 || evidencias.itensVenda > 0) motivos.push("venda/item");
  if (evidencias.movimentacoesEstoque > 0) motivos.push("movimentacao de estoque");
  if (evidencias.movimentacoesCaixa > 0) motivos.push("movimentacao de caixa");
  if (evidencias.despesas > 0) motivos.push("despesa");
  if (evidencias.notas > 0) motivos.push("nota");
  if (evidencias.produtos > 0 || evidencias.lotes > 0) motivos.push("produto/lote");
  if (evidencias.cancelamentos > 0) motivos.push("cancelamento");
  if (evidencias.indicacoes > 0) motivos.push("indicacao/referencia");

  const dataElegibilidade = calcularDataElegibilidadeExpurgo(conta, opts);
  if (agora.getTime() < dataElegibilidade.getTime()) {
    motivos.push("menos de 90 dias apos o fim do trial");
  }

  return { elegivel: motivos.length === 0, dataElegibilidade, motivos };
}

/**
 * Ordem de exclusao: filhos primeiro, Empresa por ultimo. Varia de `onDelete`
 * `Cascade`; o que nao tem cascade (ex.: `User.empresa` e SetNull) precisa sair
 * explicitamente, senao fica orfao. Nomes de modelo do Prisma.
 */
export const ORDEM_EXCLUSAO_FILHOS = [
  "saleItem",
  "salePayment",
  "sale",
  "movimentacaoEstoque",
  "movimentacaoCaixa",
  "caixa",
  "expense",
  "note",
  "cancelamento",
  "aviso",
  "product",
  "lote",
  "category",
  "memberConversion",
  "memberLink",
  "user",
] as const;

export interface ItemPlanoExpurgo {
  empresaId: string;
  nome: string;
  elegivel: boolean;
  dataElegibilidade: Date;
  motivos: string[];
  /** Ids para reconciliar no Asaas APOS o commit (nunca antes). */
  asaasCustomerId: string | null;
  asaasSubscriptionId: string | null;
}

export interface PlanoExpurgo {
  /** Sempre false: este modulo so planeja (dry-run). */
  executado: false;
  geradoEm: Date;
  elegiveis: ItemPlanoExpurgo[];
  preservadas: ItemPlanoExpurgo[];
}

export interface DepsExpurgo {
  listarCandidatas(): Promise<ContaCandidata[]>;
  coletarEvidencias(empresaId: string): Promise<EvidenciasConta>;
}

/**
 * DRY-RUN: decide o que poderia ser expurgado. Nunca apaga, nunca chama Asaas.
 * A saida e um plano para revisao humana; a execucao e outro passo, com
 * aprovacao explicita e transacao (ver regra no topo do arquivo).
 */
export async function planejarExpurgoInativas(
  deps: DepsExpurgo,
  agora: Date = new Date(),
  opts: OpcoesExpurgo = {},
): Promise<PlanoExpurgo> {
  const candidatas = await deps.listarCandidatas();
  const itens: ItemPlanoExpurgo[] = [];

  for (const conta of candidatas) {
    const evidencias = await deps.coletarEvidencias(conta.empresaId);
    const r = avaliarElegibilidadeExpurgo(conta, evidencias, agora, opts);
    itens.push({
      empresaId: conta.empresaId,
      nome: conta.nome,
      elegivel: r.elegivel,
      dataElegibilidade: r.dataElegibilidade,
      motivos: r.motivos,
      asaasCustomerId: conta.asaasCustomerId,
      asaasSubscriptionId: conta.asaasSubscriptionId,
    });
  }

  return {
    executado: false,
    geradoEm: agora,
    elegiveis: itens.filter((i) => i.elegivel),
    preservadas: itens.filter((i) => !i.elegivel),
  };
}
