export interface Empresa {
  id: string;
  nome: string;
  status: "PENDENTE" | "ATIVO" | "PAUSADO" | "EM_TESTE";
  vencimentoPlano: string | null;
  diaVencimento: number;
  telefone: string | null;
  createdAt: string;
  faturamentoTotal: number;
  _count: {
    users: number;
    products: number;
    sales: number;
  };
}
