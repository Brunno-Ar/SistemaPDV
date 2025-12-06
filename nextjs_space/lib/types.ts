/**
 * @fileoverview Tipos TypeScript centralizados do Sistema PDV
 *
 * Este arquivo contém todas as interfaces e tipos utilizados
 * em todo o sistema. Use estes tipos em vez de 'any' para
 * garantir tipagem segura e melhor experiência de desenvolvimento.
 *
 * @example
 * import { Product, Sale, User } from "@/lib/types";
 *
 * const products: Product[] = await fetchProducts();
 */

// ===========================================
// TIPOS CENTRALIZADOS DO SISTEMA PDV
// ===========================================

// --- USUÁRIO E AUTENTICAÇÃO ---
export interface User {
  id: string;
  email: string;
  name: string | null;
  nome: string | null;
  role: "master" | "admin" | "gerente" | "funcionario";
  empresaId: string | null;
  tourCompleted: boolean;
  mustChangePassword: boolean;
  metaMensal?: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: string;
  empresaId: string;
  empresaNome: string;
  vencimentoPlano?: string;
  tourCompleted: boolean;
}

// --- EMPRESA ---
export interface Empresa {
  id: string;
  nome: string;
  cnpj?: string | null;
  email?: string | null;
  telefone?: string | null;
  endereco?: string | null;
  vencimentoPlano?: Date | null;
  status: "pendente" | "ativo" | "pausado";
  createdAt: Date;
  updatedAt: Date;
}

// --- PRODUTO ---
export interface Product {
  id: string;
  nome: string;
  sku: string;
  descricao?: string | null;
  precoVenda: number;
  precoCompra: number;
  estoqueAtual: number;
  estoqueMinimo: number;
  unidadeMedida: string;
  ativo: boolean;
  imagemUrl?: string | null;
  cloudStoragePath?: string | null;
  categoriaId?: string | null;
  empresaId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductWithCategory extends Product {
  categoria?: Category | null;
}

// --- CATEGORIA ---
export interface Category {
  id: string;
  nome: string;
  empresaId: string;
}

// --- LOTE ---
export interface Lote {
  id: string;
  numeroLote: string;
  produtoId: string;
  quantidade: number;
  dataValidade?: Date | null;
  dataFabricacao?: Date | null;
  precoCompra?: number | null;
  createdAt: Date;
}

export interface LoteWithProduct extends Lote {
  produto: Product;
}

// --- VENDA ---
export interface Sale {
  id: string;
  valorTotal: number;
  valorRecebido?: number | null;
  troco?: number | null;
  metodoPagamento: MetodoPagamento;
  dataHora: Date;
  userId: string;
  empresaId: string;
}

export interface SaleItem {
  id: string;
  saleId: string;
  productId: string;
  quantidade: number;
  precoUnitario: number;
  descontoAplicado: number;
  subtotal: number;
}

export interface SaleWithItems extends Sale {
  saleItems: (SaleItem & { product: Product })[];
  user?: { name: string | null; nome: string | null };
}

// --- CAIXA ---
export interface Caixa {
  id: string;
  usuarioId: string;
  empresaId: string;
  saldoInicial: number;
  saldoFinal?: number | null;
  status: "ABERTO" | "FECHADO";
  dataAbertura: Date;
  dataFechamento?: Date | null;
  valorInformadoDinheiro?: number | null;
  valorInformadoMaquininha?: number | null;
  quebraDeCaixa?: number | null;
  justificativa?: string | null;
}

export interface MovimentacaoCaixa {
  id: string;
  caixaId: string;
  usuarioId: string;
  tipo: TipoMovimentacaoCaixa;
  valor: number;
  descricao?: string | null;
  metodoPagamento?: MetodoPagamento | null;
  dataHora: Date;
}

// --- MOVIMENTAÇÃO DE ESTOQUE ---
export interface MovimentacaoEstoque {
  id: string;
  produtoId: string;
  usuarioId: string;
  empresaId: string;
  tipo: TipoMovimentacaoEstoque;
  quantidade: number;
  motivo?: string | null;
  loteId?: string | null;
  dataMovimentacao: Date;
}

// --- AVISO ---
export interface Aviso {
  id: string;
  mensagem: string;
  importante: boolean;
  empresaId: string;
  remetenteId: string;
  criadoEm: Date;
  leituras: AvisoLeitura[];
}

export interface AvisoLeitura {
  id: string;
  avisoId: string;
  userId: string;
  lidoEm: Date;
}

// --- ENUMS ---
export type MetodoPagamento = "dinheiro" | "pix" | "credito" | "debito";

export type TipoMovimentacaoCaixa =
  | "ABERTURA"
  | "SANGRIA"
  | "SUPRIMENTO"
  | "FECHAMENTO";

export type TipoMovimentacaoEstoque =
  | "VENDA"
  | "ENTRADA"
  | "AJUSTE_QUEBRA"
  | "AJUSTE_INVENTARIO"
  | "DEVOLUCAO";

export type UserRole = "master" | "admin" | "gerente" | "funcionario";

// --- API RESPONSES ---
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// --- DASHBOARD STATS ---
export interface DashboardStats {
  totalProdutos: number;
  produtosEstoqueBaixo: number;
  vendasHoje: number;
  receitaHoje: number;
  lucroHoje: number;
  vendasSemana: number;
  receitaSemana: number;
  lucroSemana: number;
  diasParaVencimento?: number | null;
  topLowStock?: ProductWithCategory[];
}

// --- FORM DATA ---
export interface ProductFormData {
  nome: string;
  sku: string;
  descricao?: string;
  precoVenda: string | number;
  precoCompra: string | number;
  estoqueAtual: string | number;
  estoqueMinimo: string | number;
  unidadeMedida: string;
  categoriaId?: string;
  imagem?: File | null;
}

export interface EmployeeFormData {
  nome: string;
  email: string;
  password?: string;
  role: UserRole;
  metaMensal?: string | number;
}

// --- LEGACY TYPES (manter para compatibilidade) ---
export type Expense = {
  id: string;
  amount: number;
  category: string;
  description: string;
  date: Date;
};

export type ExpenseFormData = Omit<Expense, "id" | "date"> & {
  date: string;
};

export const EXPENSE_CATEGORIES = [
  "Food",
  "Transportation",
  "Housing",
  "Utilities",
  "Entertainment",
  "Healthcare",
  "Shopping",
  "Education",
  "Other",
] as const;

export type DateRange = {
  from: Date | undefined;
  to: Date | undefined;
};
