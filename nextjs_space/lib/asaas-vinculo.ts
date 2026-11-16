/**
 * Regras puras do vinculo/provisionamento Asaas do painel master.
 *
 * Sem Prisma e sem I/O: recebem o que o service ja buscou (Asaas + DB) e
 * devolvem decisao. Assim os testes cobrem 0/1/>1 assinaturas, conflito de
 * customer, token de preview e montagem da proposta sem mock de rede.
 *
 * FRONTEIRA DO PRODUTO (nao afrouxar):
 *  - assinatura ACTIVE nao paga nada; acesso so com PAYMENT_RECEIVED provado
 *    (customer/subscription iguais + value >= piso + dueDate cobrindo o ciclo);
 *  - nada aqui cria, altera ou cancela no Asaas — isso e do service, e so no
 *    confirm com token de preview valido.
 */

import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export type StatusAsaasTerminal = "CANCELLED" | "CANCELED";

export interface AssinaturaAsaas {
  id: string;
  status?: string | null;
  customer?: string | null;
  customerId?: string | null;
  value?: number | null;
  cycle?: string | null;
  nextDueDate?: string | null;
}

export type ClassificacaoAssinaturas =
  | { tipo: "nenhuma"; total: 0 }
  | { tipo: "unica"; total: 1; candidata: AssinaturaAsaas }
  | {
      tipo: "conflito";
      total: number;
      motivo: "multipla" | "inativa_unica";
      candidatos: AssinaturaAsaas[];
    };

const STATUS_NAO_REUTILIZAVEL: ReadonlyArray<string> = [
  "CANCELLED",
  "CANCELED",
  "INACTIVE",
  "EXPIRED",
];

/**
 * Classifica as assinaturas do customer para decidir reuso x criacao.
 *
 *  - 0: pode criar (o preview diz isso explicitamente ao master);
 *  - 1 com status reutilizavel: reusa, sem duplicar;
 *  - 1 inativa ou >1: CONFLITO. Nunca escolher sozinho entre assinaturas e
 *    nunca "consertar" uma assinatura inativa criando outra por cima.
 */
export function classificarAssinaturas(
  assinaturas: ReadonlyArray<AssinaturaAsaas> | null,
): ClassificacaoAssinaturas {
  if (!assinaturas || assinaturas.length === 0) {
    return { tipo: "nenhuma", total: 0 };
  }

  if (assinaturas.length > 1) {
    return {
      tipo: "conflito",
      total: assinaturas.length,
      motivo: "multipla",
      candidatos: [...assinaturas],
    };
  }

  const unica = assinaturas[0];
  const status = (unica.status ?? "").toUpperCase();

  if (STATUS_NAO_REUTILIZAVEL.includes(status)) {
    return {
      tipo: "conflito",
      total: 1,
      motivo: "inativa_unica",
      candidatos: [unica],
    };
  }

  return { tipo: "unica", total: 1, candidata: unica };
}

export interface DadosProposta {
  /** Valor ja resolvido pela fonte unica (assinatura existente ou preco/cupom). */
  valor: number;
  /** Ciclo em formato Asaas (MONTHLY) — resolvido, nunca inventado. */
  ciclo: string;
  /** Tipo de cobranca Asaas (UNDEFINED = Pix/Boleto). */
  billingType: string;
  /** Primeiro vencimento ISO (YYYY-MM-DD), sempre hoje ou no futuro. */
  primeiroVencimento: string;
}

export type ResultadoProposta =
  | { ok: true; proposta: DadosProposta }
  | { ok: false; motivo: string };

const BILLING_TYPES = ["UNDEFINED", "PIX", "BOLETO", "CREDIT_CARD"];

/**
 * Promocao para ATIVO exige as tres provas juntas: pagamento RECEIVED
 * confirmado, cobertura comprovada existente e cobertura ainda vigente.
 * `null`/vencida nunca promove. Fonte unica usada por preview, confirm e
 * sync-all — evita divergencia entre caminhos.
 */
export function podePromover(
  pagamentoConfirmado: boolean,
  cobertura: Date | null | undefined,
  agora: Date,
): boolean {
  if (!pagamentoConfirmado || !cobertura) return false;
  const fim = cobertura instanceof Date ? cobertura : new Date(cobertura);
  if (Number.isNaN(fim.getTime())) return false;
  return fim.getTime() > agora.getTime();
}

/**
 * Monta a proposta de criacao sem fallback silencioso: valor, ciclo e primeiro
 * vencimento tem que vir de fonte inequivoca (assinatura existente, preco
 * publicado ou cupom valido) e o vencimento nao pode ser retroativo.
 */
export function montarProposta(
  dados: Partial<DadosProposta> & { hoje?: Date },
): ResultadoProposta {
  const valor = dados.valor;
  if (typeof valor !== "number" || !Number.isFinite(valor) || valor <= 0) {
    return { ok: false, motivo: "valor da assinatura indefinido" };
  }

  const ciclo = (dados.ciclo ?? "").toUpperCase();
  if (ciclo !== "MONTHLY") {
    return {
      ok: false,
      motivo: `ciclo ${ciclo || "indefinido"} nao suportado no provisionamento`,
    };
  }

  const billingType = (dados.billingType || "UNDEFINED").toUpperCase();
  if (!BILLING_TYPES.includes(billingType)) {
    return { ok: false, motivo: "tipo de cobranca indefinido" };
  }

  const primeiro = dados.primeiroVencimento;
  if (!primeiro || !/^\d{4}-\d{2}-\d{2}$/.test(primeiro)) {
    return { ok: false, motivo: "primeiro vencimento indefinido" };
  }

  const hoje = dados.hoje ?? new Date();
  const hojeIso = hoje.toISOString().slice(0, 10);
  if (primeiro < hojeIso) {
    return { ok: false, motivo: "primeiro vencimento retroativo" };
  }

  return { ok: true, proposta: { valor, ciclo, billingType, primeiroVencimento: primeiro } };
}

/** JSON estavel (chaves ordenadas) para o hash de snapshot do preview. */
export function jsonEstavel(valor: unknown): string {
  if (valor === null || typeof valor !== "object") return JSON.stringify(valor);
  if (Array.isArray(valor)) return `[${valor.map(jsonEstavel).join(",")}]`;

  const obj = valor as Record<string, unknown>;
  const chaves = Object.keys(obj)
    .filter((k) => obj[k] !== undefined)
    .sort();
  const corpo = chaves.map((k) => `${JSON.stringify(k)}:${jsonEstavel(obj[k])}`);
  return `{${corpo.join(",")}}`;
}

/** Versao do snapshot: qualquer mudanca no estado (Asaas ou DB) muda o hash. */
export function versaoSnapshot(estado: unknown): string {
  return createHash("sha256").update(jsonEstavel(estado)).digest("hex");
}

export interface PayloadPreview {
  /** Empresa alvo do preview. */
  empresaId: string;
  /** Modo que o preview viu; o confirm exige o mesmo. */
  modo: string;
  /** Hash do snapshot conferido. */
  versao: string;
  /** Epoch ms de expiracao (preview curto: 10 min). */
  exp: number;
}

export type VerificacaoToken =
  | { ok: true; payload: PayloadPreview }
  | { ok: false; motivo: "formato" | "assinatura" | "expirado" | "divergente" };

function base64url(input: Buffer): string {
  return input.toString("base64url");
}

/**
 * Assina o preview com HMAC. Sem segredo configurado o chamador deve falhar
 * fechado (503) — nao existe fallback de segredo.
 */
export function gerarTokenPreview(payload: PayloadPreview, segredo: string): string {
  const corpo = base64url(Buffer.from(jsonEstavel(payload), "utf8"));
  const assinatura = createHmac("sha256", segredo).update(corpo).digest("hex");
  return `${corpo}.${assinatura}`;
}

/**
 * Verifica assinatura, expiracao e — quando informado — se o token ainda
 * corresponde ao preview atual (empresa, modo e versao). Preview obsoleto e
 * recusado: o confirm sempre revalida antes de escrever.
 */
export function verificarTokenPreview(
  token: string | null | undefined,
  esperado: { segredo: string; empresaId: string; modo: string; versao: string; agora?: Date },
): VerificacaoToken {
  if (!token || typeof token !== "string" || !token.includes(".")) {
    return { ok: false, motivo: "formato" };
  }

  const [corpo, assinatura] = token.split(".");
  if (!corpo || !assinatura) return { ok: false, motivo: "formato" };

  const esperada = createHmac("sha256", esperado.segredo)
    .update(corpo)
    .digest("hex");
  const a = Buffer.from(esperada, "utf8");
  const b = Buffer.from(assinatura, "utf8");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, motivo: "assinatura" };
  }

  let payload: PayloadPreview;
  try {
    payload = JSON.parse(Buffer.from(corpo, "base64url").toString("utf8"));
  } catch {
    return { ok: false, motivo: "formato" };
  }

  const agora = (esperado.agora ?? new Date()).getTime();
  if (typeof payload.exp !== "number" || payload.exp <= agora) {
    return { ok: false, motivo: "expirado" };
  }

  if (
    payload.empresaId !== esperado.empresaId ||
    payload.modo !== esperado.modo ||
    payload.versao !== esperado.versao
  ) {
    return { ok: false, motivo: "divergente" };
  }

  return { ok: true, payload };
}

/** CPF/CNPJ mascarado para resposta/log: so os 4 ultimos digitos. */
export function mascararDocumento(doc: string | null | undefined): string | null {
  if (!doc) return null;
  const digitos = doc.replace(/\D/g, "");
  if (digitos.length < 4) return "****";
  return `***${digitos.slice(-4)}`;
}

/** Email mascarado: 2 primeiros caracteres + dominio. */
export function mascararEmail(email: string | null | undefined): string | null {
  if (!email || !email.includes("@")) return null;
  const [usuario, dominio] = email.split("@");
  const visivel = usuario.slice(0, 2);
  return `${visivel}${"*".repeat(Math.max(usuario.length - 2, 1))}@${dominio}`;
}
