import type { AsaasAdminResumo } from "./asaas-vinculo-types";

export interface Empresa {
  id: string;
  nome: string;
  status: "PENDENTE" | "ATIVO" | "PAUSADO" | "EM_TESTE";
  vencimentoPlano: string | null;
  diaVencimento: number;
  /** Limite EXCLUSIVO de liberação manual (00:00 de São Paulo do dia seguinte). */
  liberacaoTemporariaAte?: string | null;
  telefone: string | null;
  createdAt: string;
  faturamentoTotal: number;
  asaasCustomerId: string | null;
  asaasSubscriptionId: string | null;
  adminsFaturamento?: AsaasAdminResumo[];
  _count: {
    users: number;
    products: number;
    sales: number;
  };
}
