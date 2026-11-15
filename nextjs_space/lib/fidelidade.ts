/**
 * Regras de fidelidade Member Get Member (indicacao).
 *
 * Marcos UNICOS (a nota nao define recompensa recorrente apos o primeiro):
 *  - 3 conversoes pagas -> 1 mes gratis (acumula).
 *  - 5 conversoes pagas -> 50% de desconto permanente; o mes gratis conquistado
 *    no marco 3 permanece (acumula).
 *
 * SEM COLUNAS NOVAS (alteracao de schema em producao esta proibida):
 *  - marco 3 "ja concedido" = existe MemberConversion PAGA com mesGratisGerado
 *    (coluna existente); a concessao vira CAS condicional nessa coluna;
 *  - marco 5 = derivado da contagem de conversoes PAGAS (sem coluna de marco);
 *  - o DIREITO ao mes gratis fica gravado em Empresa.vencimentoPlano (ledger
 *    durável): o mes e adicionado na mesma transacao da concessao e o Asaas e
 *    reconciliado ate `nextDueDate >= vencimentoPlano`. Repetir a reconciliacao
 *    e no-op (monotona), entao falha do Asaas e recuperada no retry do webhook.
 *
 * Funcoes puras (sem Prisma) para rodar no webhook e em teste.
 */

import type { Prisma } from "@prisma/client";
import { PRECO_PLANO_PADRAO } from "@/lib/pagamento";

/** Cliente de transacao Prisma (recebido por injecao para testabilidade). */
export type TxCliente = Prisma.TransactionClient;

export const MARCO_MES_GRATIS = 3;
export const MARCO_DESCONTO = 5;
export const DESCONTO_PERCENTUAL = 50;
export const MESES_POR_CREDITO = 1;

export interface RecompensaFidelidade {
  /** Concede 1 mes gratis (marco 3). */
  concederMarco3: boolean;
  /** Percentual de desconto permanente a refletir na assinatura. */
  descontoPercentual: number;
}

/**
 * Deriva a recompensa a partir dos dados existentes. `mesGratisJaGerado` vem de
 * MemberConversion.mesGratisGerado, entao evento duplicado nao concede 2x.
 */
export function calcularRecompensa(
  pagas: number,
  mesGratisJaGerado: boolean,
): RecompensaFidelidade {
  return {
    concederMarco3: pagas >= MARCO_MES_GRATIS && !mesGratisJaGerado,
    descontoPercentual: pagas >= MARCO_DESCONTO ? DESCONTO_PERCENTUAL : 0,
  };
}

/** Preço efetivo do plano após desconto percentual (arredonda a centavos). */
export function precoComDesconto(
  precoTabela: number,
  percentual: number,
): number {
  const pct = Math.min(Math.max(percentual, 0), 100);
  return Math.round(precoTabela * (1 - pct / 100) * 100) / 100;
}

/**
 * Avanca `meses` meses preservando o fim de mes (31/01 + 1 mes -> 28/02),
 * mesma regra usada no webhook de pagamento.
 */
export function adicionarMeses(base: Date, meses: number): Date {
  const data = new Date(base);
  const diaOriginal = data.getDate();
  data.setMonth(data.getMonth() + meses);
  if (data.getDate() !== diaOriginal) {
    data.setDate(0);
  }
  return data;
}

// =====================================================================
// Persistencia TRANSACIONAL da recompensa (member get member).
//
// Roda DENTRO da transacao que credita o pagamento (mesmo tx do plano), para
// que "pagamento confirmado" e "recompensa aplicada" sejam atomicos: se a
// recompensa falhar, o pagamento NAO fica marcado e o retry do Asaas reprocessa.
//
// Idempotente no banco, nao em memoria:
//  - transicao TRIAL -> PAGO via updateMany condicional (count 1 = venceu);
//  - marco 3 via updateMany condicional em mesGratisGerado;
//  - o mes gratis e aplicado no vencimento local na MESMA transacao, entao o
//    direito nao se perde.
// =====================================================================

export interface ResultadoRecompensaIndicacao {
  marco3Novo: boolean;
  descontoPercentual: number;
  indicadorId: string | null;
  /** Novo vencimento do INDICADOR (ja estendido) para reconciliar o Asaas. */
  vencimentoIndicador: Date | null;
}

export async function aplicarRecompensaIndicacao(
  tx: TxCliente,
  empresaConvertidaId: string,
  agora: Date = new Date(),
): Promise<ResultadoRecompensaIndicacao> {
  const semRecompensa: ResultadoRecompensaIndicacao = {
    marco3Novo: false,
    descontoPercentual: 0,
    indicadorId: null,
    vencimentoIndicador: null,
  };

  const conversao = await tx.memberConversion.findUnique({
    where: { novaEmpresaId: empresaConvertidaId },
    select: { id: true, linkId: true },
  });

  if (!conversao) return semRecompensa;

  // Serializa concessoes do MESMO link: sem isso, duas conversoes concorrentes
  // leem os marcos antes do commit uma da outra e podem creditar 2x.
  await tx.$queryRaw`SELECT id FROM "member_links" WHERE id = ${conversao.linkId} FOR UPDATE`;

  // Idempotencia: garante uma unica transicao TRIAL -> PAGO por conversao.
  const transicao = await tx.memberConversion.updateMany({
    where: { id: conversao.id, status: "TRIAL" },
    data: { status: "PAGO" },
  });

  if (transicao.count === 0) return semRecompensa;

  const link = await tx.memberLink.findUnique({
    where: { id: conversao.linkId },
    select: { id: true, empresaId: true },
  });

  if (!link) return semRecompensa;

  const pagas = await tx.memberConversion.count({
    where: { linkId: link.id, status: "PAGO" },
  });

  const mesGratisJaGerado =
    (await tx.memberConversion.count({
      where: { linkId: link.id, status: "PAGO", mesGratisGerado: true },
    })) > 0;

  const { concederMarco3, descontoPercentual } = calcularRecompensa(
    pagas,
    mesGratisJaGerado,
  );

  let marco3Novo = false;
  let vencimentoIndicador: Date | null = null;

  if (concederMarco3) {
    const grant = await tx.memberConversion.updateMany({
      where: { id: conversao.id, mesGratisGerado: false },
      data: { mesGratisGerado: true },
    });

    if (grant.count === 1) {
      const indicador = await tx.empresa.findUnique({
        where: { id: link.empresaId },
        select: { vencimentoPlano: true },
      });

      const vencimentoAtual = indicador?.vencimentoPlano
        ? new Date(indicador.vencimentoPlano)
        : null;
      const base =
        vencimentoAtual && vencimentoAtual > agora ? vencimentoAtual : agora;
      vencimentoIndicador = adicionarMeses(base, MESES_POR_CREDITO);

      // CAS no vencimento: se outro processo ja avancou, o update nao aplica e
      // relemos o valor efetivo (a reconciliacao do Asaas usa o valor final).
      const estendeu = await tx.empresa.updateMany({
        where: {
          id: link.empresaId,
          OR: [
            { vencimentoPlano: vencimentoAtual },
            { vencimentoPlano: null },
          ],
        },
        data: { vencimentoPlano: vencimentoIndicador },
      });

      if (estendeu.count !== 1) {
        const recarregado = await tx.empresa.findUnique({
          where: { id: link.empresaId },
          select: { vencimentoPlano: true },
        });
        vencimentoIndicador = recarregado?.vencimentoPlano ?? null;
      }

      marco3Novo = true;
    }
  }

  if (marco3Novo || descontoPercentual > 0) {
    console.log(
      `[MGM] Indicacao: link ${link.id} pagas=${pagas}` +
        `${marco3Novo ? " +1 mes gratis" : ""}` +
        `${descontoPercentual > 0 ? ` desconto ${descontoPercentual}% permanente` : ""}`,
    );
  }

  return {
    marco3Novo,
    descontoPercentual,
    indicadorId: link.empresaId,
    vencimentoIndicador,
  };
}

// =====================================================================
// Reconciliacao IDEMPOTENTE dos beneficios na assinatura do Asaas.
//
// Sem estado novo: o esperado e DERIVADO de dados que ja existem.
//  - Vencimento: `nextDueDate` do Asaas nunca pode ficar atras do vencimento
//    local (que ja inclui o mes gratis). So empurra para frente — nunca puxa
//    de volta, entao nao encurta cobertura paga nem mexe em fatura emitida.
//  - Valor: com desconto derivado (pagas >= 5), o valor da ASSINATURA deve ser
//    o preco com desconto. So reduz; nunca aumenta (cobrancas futuras).
// Repetir a operacao e no-op => retry do webhook/Asaas e sync manual recuperam
// falha de `updateSubscriptionValue`/`updateSubscriptionDueDate`.
// =====================================================================

export interface EstadoBeneficios {
  /** total de conversoes PAGAS do link indicador */
  pagas: number;
  /** conversoes PAGAS com mesGratisGerado */
  mesesGratisGerados: number;
  vencimentoPlano: Date | null;
}

export interface AssinaturaAsaas {
  nextDueDate: string;
  value: number;
}

export interface PlanoAlinhamento {
  adiarPara: Date | null;
  novoValor: number | null;
}

/** Derivacao pura: o que precisa ser empurrado na assinatura (se algo). */
export function planejarAlinhamentoAssinatura(
  estado: EstadoBeneficios,
  assinatura: AssinaturaAsaas | null,
  precoTabela: number = PRECO_PLANO_PADRAO,
): PlanoAlinhamento {
  const plano: PlanoAlinhamento = { adiarPara: null, novoValor: null };
  if (!assinatura) return plano;

  if (estado.mesesGratisGerados > 0 && estado.vencimentoPlano) {
    const venc = new Date(estado.vencimentoPlano);
    const atual = new Date(assinatura.nextDueDate);
    if (
      !Number.isNaN(venc.getTime()) &&
      !Number.isNaN(atual.getTime()) &&
      atual.getTime() < venc.getTime()
    ) {
      plano.adiarPara = venc;
    }
  }

  const percentual = estado.pagas >= MARCO_DESCONTO ? DESCONTO_PERCENTUAL : 0;
  if (percentual > 0) {
    const esperado = precoComDesconto(precoTabela, percentual);
    if (assinatura.value > esperado + 0.01) {
      plano.novoValor = esperado;
    }
  }

  return plano;
}

export interface DepsAlinhamento {
  lerEstado: () => Promise<EstadoBeneficios>;
  lerAssinatura: () => Promise<AssinaturaAsaas | null>;
  adiarAssinatura: (novoVencimento: Date) => Promise<unknown>;
  atualizarValor: (novoValor: number) => Promise<unknown>;
}

/**
 * Aplica o plano de alinhamento. Cada efeito externo e best-effort e reportado
 * em `falhas`: o chamador pode devolver erro ao Asaas para forcar retry (a
 * operacao e idempotente, entao reprocessar e seguro).
 */
export async function sincronizarBeneficiosAssinatura(
  deps: DepsAlinhamento,
  precoTabela: number = PRECO_PLANO_PADRAO,
): Promise<{ adiado: boolean; valorAtualizado: boolean; falhas: string[] }> {
  const falhas: string[] = [];
  let adiado = false;
  let valorAtualizado = false;

  const estado = await deps.lerEstado();
  if (estado.pagas < MARCO_MES_GRATIS && estado.mesesGratisGerados === 0) {
    return { adiado, valorAtualizado, falhas };
  }

  const assinatura = await deps.lerAssinatura();
  const plano = planejarAlinhamentoAssinatura(estado, assinatura, precoTabela);

  if (plano.adiarPara) {
    try {
      await deps.adiarAssinatura(plano.adiarPara);
      adiado = true;
    } catch (e) {
      falhas.push(`dueDate: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  if (plano.novoValor !== null) {
    try {
      await deps.atualizarValor(plano.novoValor);
      valorAtualizado = true;
    } catch (e) {
      falhas.push(`value: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return { adiado, valorAtualizado, falhas };
}
