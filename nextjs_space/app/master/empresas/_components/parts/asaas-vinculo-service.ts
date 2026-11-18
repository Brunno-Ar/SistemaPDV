import type {
  AsaasAdminResumo,
  AsaasPreviewPayload,
  AsaasPreviewRequest,
  ConfirmacaoResultado,
} from "./asaas-vinculo-types";

const BASE = "/api/master/asaas";

/**
 * Motivo granular do backend -> texto que o master entende.
 * Sem isso a UI mostra codigo tecnico (conflito_vinculo, sem_documento).
 */
const MENSAGENS_MOTIVO: Record<string, string> = {
  sem_documento:
    "A empresa não tem CPF/CNPJ cadastrado. Salve o documento fiscal da empresa antes de provisionar no Asaas.",
  sem_email_admin:
    "O contato de faturamento escolhido não tem e-mail válido para o cadastro no Asaas.",
  admin_invalido:
    "O contato escolhido não é um administrador válido desta empresa. Escolha outro.",
  admin_nao_encontrado_ou_invalido:
    "O contato escolhido não é um administrador válido desta empresa. Escolha outro.",
  customer_de_outra_empresa:
    "Este CPF/CNPJ já está vinculado a outra empresa no Asaas. Resolva o vínculo antes de continuar.",
  multiplas_assinaturas_no_customer:
    "Este cliente tem mais de uma assinatura no Asaas. Defina qual deve valer antes de sincronizar.",
  assinatura_unica_inativa:
    "A assinatura encontrada está inativa no Asaas. Reative-a antes de sincronizar.",
  ciclo_nao_suportado: "Só o ciclo mensal é suportado no provisionamento.",
  "primeiro vencimento retroativo":
    "O primeiro vencimento não pode estar no passado. Escolha uma data de hoje em diante.",
  "primeiro vencimento indefinido":
    "Informe a data do primeiro vencimento para gerar a cobrança.",
  "valor da assinatura indefinido":
    "O valor do plano está indefinido. Revise o preço antes de provisionar.",
  "tipo de cobranca indefinido":
    "O tipo de cobrança está indefinido. Revise a forma de pagamento antes de provisionar.",
  cupom_aplicado_inexistente:
    "O cupom aplicado não existe mais. Remova o cupom da empresa antes de provisionar.",
  cupom_aplicado_expirado:
    "O cupom aplicado está expirado. Remova o cupom da empresa antes de provisionar.",
  cupom_aplicado_esgotado:
    "O cupom aplicado esgotou. Remova o cupom da empresa antes de provisionar.",
  valor_do_cupom_invalido:
    "O cupom aplicado deixou o valor inválido. Revise o cupom antes de provisionar.",
  proposta_ausente:
    "A prévia não gerou proposta de assinatura. Recarregue a prévia e tente de novo.",
  customer_ja_vinculado_por_outra_execucao:
    "Outra execução vinculou este cliente no Asaas. Recarregue a prévia para ver o estado atual.",
  assinatura_ja_vinculada_por_outra_execucao:
    "Outra execução vinculou esta assinatura no Asaas. Recarregue a prévia para ver o estado atual.",
};

/**
 * Traduz codigo tecnico do backend em texto para o master.
 * Desconhecido ou vazio cai no texto generico: codigo tecnico nunca vaza na UI.
 */
export function mensagemDoMotivo(
  motivo: string | null | undefined,
  fallback = "Não foi possível concluir a operação no Asaas. Revise o cadastro da empresa e tente de novo.",
): string {
  if (!motivo) return fallback;
  return MENSAGENS_MOTIVO[motivo] ?? fallback;
}

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
    // 409 multiplos_admins_selecao_obrigatoria: o backend envia
    // erro "conflito_vinculo" com motivo "multiplos_admins_selecao_obrigatoria".
    // Casa pelo motivo (e pelo erro, por compatibilidade) para o dialog
    // receber a lista de admins em vez de um erro generico sem saida.
    const isMultiplosAdmins =
      res.status === 409 &&
      (json.motivo === "multiplos_admins_selecao_obrigatoria" ||
        json.erro === "multiplos_admins_selecao_obrigatoria");

    if (isMultiplosAdmins) {
      const mensagem =
        json.mensagem ||
        "A empresa tem múltiplos administradores. Selecione o contato de faturamento para continuar.";
      throw new AsaasPreviewError(
        "multiplos_admins_selecao_obrigatoria",
        mensagem,
        Array.isArray(json.admins) ? json.admins : undefined,
      );
    }

    // Demais conflitos: o backend manda o motivo granular, mas a UI nao deve
    // exibir codigo tecnico. Mapeia para texto humano com fallback generico.
    const codigo =
      json.motivo || json.erro || "preview_falhou";
    const mensagem =
      json.mensagem ||
      MENSAGENS_MOTIVO[codigo] ||
      "Não foi possível montar a prévia do Asaas. Revise o cadastro da empresa e tente de novo.";
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
