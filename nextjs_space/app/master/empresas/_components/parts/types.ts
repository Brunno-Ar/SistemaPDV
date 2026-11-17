import type { AsaasAdminResumo } from "./asaas-vinculo-types";

export interface Empresa {
  id: string;
  nome: string;
  status: "PENDENTE" | "ATIVO" | "PAUSADO" | "EM_TESTE";
  vencimentoPlano: string | null;
  diaVencimento: number;
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
