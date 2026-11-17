import type {
  AsaasAdminResumo,
  AsaasPreviewPayload,
  AsaasPreviewRequest,
  ConfirmacaoResultado,
} from "./asaas-vinculo-types";

const BASE = "/api/master/asaas";

/** Erro tipificado do preview: motivo estrutural do backend. */
export class AsaasPreviewError extends Error {
  codigo: string;
  admins?: AsaasAdminResumo[];

  constructor(codigo: string, mensagem: string, admins?: AsaasAdminResumo[]) {
    super(mensagem);
    this.name = "AsaasPreviewError";
    this.codigo = codigo;
    this.admins = admins;
  }
}

/**
 * Obtem a previa da sincronizacao/vinculo Asaas.
 * Endpoint estritamente de leitura (seguro, idempotente).
 * Preserva o motivo 409 multiplos_admins_selecao_obrigatoria para que o
 * dialog possa exibir a lista de admins e permitir selecao (nao esconde a
 * acao nem converte em conflito irresolvivel).
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
    const codigo = json.erro || "preview_falhou";
    const mensagem = json.mensagem || json.erro || "Falha ao obter prévia";
    // 409 multiplos_admins_selecao_obrigatoria: preserva o motivo e, quando
    // o backend enviar, a lista de admins para selecao.
    if (res.status === 409 && codigo === "multiplos_admins_selecao_obrigatoria") {
      throw new AsaasPreviewError(
        "multiplos_admins_selecao_obrigatoria",
        mensagem,
        Array.isArray(json.admins) ? json.admins : undefined,
      );
    }
    throw new AsaasPreviewError(codigo, mensagem);
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
