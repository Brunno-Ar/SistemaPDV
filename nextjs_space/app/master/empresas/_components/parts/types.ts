export interface Empresa {
  id: string;
  nome: string;
  status: "PENDENTE" | "ATIVO" | "PAUSADO";
  vencimentoPlano: string | null;
  createdAt: string;
  faturamentoTotal: number;
  _count: {
    users: number;
    products: number;
    sales: number;
  };
}
