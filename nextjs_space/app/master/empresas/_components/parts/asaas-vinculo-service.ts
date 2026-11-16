import type { AsaasPreviewPayload, ConfirmacaoResultado } from "./asaas-vinculo-types";

const BASE = "/api/master/asaas";

/**
 * Solicita a prévia somente-leitura de vínculo/provisionamento Asaas para uma
 * empresa. Não cria customer, não cria assinatura, não escreve nada.
 */
export async function montarPreviewAsaas(
  empresaId: string,
): Promise<AsaasPreviewPayload> {
  const res = await fetch(`${BASE}/preview`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ empresaId }),
  });

  const json = await res.json();

  if (!res.ok || !json.ok) {
    throw new Error(json.erro || "Erro ao gerar prévia do Asaas");
  }

  return json.preview;
}

/**
 * Confirma o preview (única porta de escrita). Requer token emitido pelo preview.
 * Nunca executa sem token válido.
 */
export async function confirmarPreviewAsaas(args: {
  empresaId: string;
  token: string;
  confirmarTerminal?: boolean;
  confirmarTermos?: boolean;
}): Promise<ConfirmacaoResultado> {
  const res = await fetch(`${BASE}/confirm`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });

  const json = await res.json();

  return {
    ok: res.ok && json.ok === true,
    modo: json.modo ?? "",
    aplicado: json.aplicado === true,
    statusFinal: json.statusFinal,
    vencimentoPlano: json.vencimentoPlano ?? null,
    erro: json.erro,
    conflito: json.conflito ?? null,
  };
}
