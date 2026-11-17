/**
 * Contratos de tipo para o fluxo Asaas (preview + confirmacao).
 * Alinhado a lib/master-asaas.ts.
 */

export interface AsaasPreviewPayload {
  empresaId: string;
  modo: "vinculada" | "provisionamento" | "conflito";
  versao: string;
  token: string;
  expiraEm: string;
  empresa: {
    nome: string;
    status: string;
    vencimentoPlano: string | null;
    plano?: string;
    cupomAplicado?: string | null;
    documentoMascarado?: string | null;
    emailMascarado?: string | null;
    adminId?: string | null; // contato de faturamento selecionado/validado pelo backend
    adminEmailMascarado?: string | null; // email do admin selecionado (opcional)
    admins?: AsaasAdminResumo[]; // lista de admins de faturamento da empresa
  };
  asaas: {
    customer: { id: string | null; situacao: "existente" | "ausente" };
    assinatura: {
      id: string | null;
      situacao?: "existente" | "ausente";
      status: string | null;
      valor: number | null;
      ciclo: string | null;
      vencimento?: string | null;
      total?: number;
      candidatos?: AsaasCandidatoResumo[];
    } | null;
    pagamento: {
      recebido?: boolean;
      fonte?: string;
      coberturaAte?: string | null;
      pendente?: boolean;
      situacao?: "comprovado" | "ausente";
      tipo?: string | null;
      data?: string | null;
    };
  };
  proposta: {
    acao: "sincronizar" | "vincular_assinatura" | "criar_assinatura";
    statusAtual: string;
    statusProposto: string;
    statusNovo?: string;
    vencimentoAtual: string | null;
    vencimentoProposto: string | null;
    vencimentoNovo?: string | null;
    motivo?: string;
    liberaAcesso?: boolean;
    requerConfirmacaoTermos?: boolean;
    requerConfirmacaoTerminal?: boolean;
    statusAsaasTerminal?: boolean;
  };
  provisionamento?: {
    criarCustomer: boolean;
    criarAssinatura: boolean;
    valor: number;
    ciclo: string;
    billingType: string;
    primeiroVencimento: string;
    adminId?: string | null; // admin de faturamento vinculado ao provisionamento
  };
  conflito?: { motivo: string; candidatos: AsaasCandidatoResumo[] };
  avisos: string[];
}

export interface ConfirmacaoResultado {
  ok: boolean;
  modo?: "vinculada" | "provisionamento" | "conflito";
  aplicado: boolean;
  statusFinal?: string;
  vencimentoPlano: string | null;
  primeiroVencimento?: string;
  adminId?: string;
  erro?: string;
  conflito?: { motivo: string; candidatos: AsaasCandidatoResumo[] } | null;
}

/** Corpo da requisição POST /api/master/asaas/preview (só leitura). */
export interface AsaasPreviewRequest {
  empresaId: string;
  primeiroVencimento?: string; // YYYY-MM-DD; quando omitido, o backend usa +14 dias
  adminId?: string; // contato de faturamento selecionado (opcional; sem arbitrário)
}

/** Resumo de um admin/contato da empresa para seleção no preview. */
export interface AsaasAdminResumo {
  id: string;
  nome: string;
  emailMascarado: string | null;
}

export interface AsaasCandidatoResumo {
  id: string;
  status: string | null;
  valor: number | null;
  ciclo: string | null;
  vencimento: string | null;
}
