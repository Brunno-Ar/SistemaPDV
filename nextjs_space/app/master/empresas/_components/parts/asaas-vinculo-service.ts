import type {
  AsaasPreviewPayload,
  AsaasPreviewRequest,
  ConfirmacaoResultado,
} from "./asaas-vinculo-types";

const BASE = "/api/master/asaas";

/**
 * Obtem a previa da sincronizacao/vinculo Asaas.
 * Endpoint estritamente de leitura (seguro, idempotente).
 */
export async function montarPreviewAsaas(
  empresaId: string,
  primeiroVencimento?: string,
  adminId?: string,
): Promise<AsaasPreviewPayload> {
  const corpo: AsaasPreviewRequest = { empresaId };
  if (primeiroVencimento) corpo.primeiroVencimento = primeiroVencimento;
  if (adminId) corpo.adminId = adminId;

  const res = await fetch(`${BASE}/preview`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(corpo),
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.erro || "Falha ao obter prévia");
  }
  return json.preview;
}

/**
 * Confirma a proposta obtida na previa.
 * Revalida o snapshot via token HMAC antes de qualquer mutacao.
 */
export async function confirmarPreviewAsaas(args: {
  empresaId: string;
  token: string;
  confirmarTerminal?: boolean;
  confirmarTermos?: boolean;
  primeiroVencimento?: string;
  adminId?: string;
}): Promise<ConfirmacaoResultado> {
  const res = await fetch(`${BASE}/confirm`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      empresaId: args.empresaId,
      token: args.token,
      confirmarTerminal: args.confirmarTerminal,
      confirmarTermos: args.confirmarTermos,
      primeiroVencimento: args.primeiroVencimento,
      adminId: args.adminId,
    }),
  });

  const json = await res.json();
  return {
    ok: res.ok && json.ok === true,
    modo: json.modo,
    aplicado: json.aplicado === true,
    statusFinal: json.statusFinal,
    vencimentoPlano: json.vencimentoPlano ?? null,
    primeiroVencimento: json.primeiroVencimento,
    adminId: json.adminId,
    erro: json.erro,
    conflito: json.conflito ?? null,
  };
}
