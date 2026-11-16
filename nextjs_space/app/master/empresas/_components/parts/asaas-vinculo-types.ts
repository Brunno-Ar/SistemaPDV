export type ModoAsaas = "vinculada" | "provisionamento" | "conflito";

export interface AsaasCandidatoResumo {
  id: string;
  status: string | null;
  valor: number | null;
  ciclo: string | null;
  vencimento: string | null;
}

export interface AsaasPreviewPayload {
  empresaId: string;
  modo: ModoAsaas;
  versao: string;
  token: string;
  expiraEm: string;
  empresa: {
    nome: string;
    status: string;
    vencimentoPlano: string | null;
    ciclo: string;
    cupomAplicado: string | null;
    documentoMascarado: string | null;
    emailMascarado: string | null;
  };
  asaas: {
    customer: { id: string | null; situacao: "existente" | "ausente" };
    assinatura: {
      id: string | null;
      situacao: "existente" | "ausente" | "multipla";
      status: string | null;
      valor: number | null;
      ciclo: string | null;
      total: number;
      candidatos: AsaasCandidatoResumo[];
    };
    pagamento: {
      recebido: boolean;
      fonte: string;
      coberturaAte: string | null;
      pendente: boolean;
    };
  };
  proposta: {
    acao: "sincronizar" | "vincular_assinatura" | "criar_assinatura";
    statusAtual: string;
    statusProposto: string;
    statusAsaasTerminal: boolean;
    requerConfirmacaoTerminal: boolean;
    requerConfirmacaoTermos: boolean;
    vencimentoAtual: string | null;
    vencimentoProposto: string | null;
    liberaAcesso: boolean;
  };
  provisionamento?: {
    criarCustomer: boolean;
    criarAssinatura: boolean;
    valor: number;
    ciclo: string;
    billingType: string;
    primeiroVencimento: string;
  };
  conflito?: { motivo: string; candidatos: AsaasCandidatoResumo[] };
  avisos: string[];
}

export interface ConfirmacaoResultado {
  ok: boolean;
  modo: string;
  aplicado: boolean;
  statusFinal?: string;
  vencimentoPlano: string | null;
  erro?: string;
  conflito?: { motivo: string; candidatos: AsaasCandidatoResumo[] } | null;
}
