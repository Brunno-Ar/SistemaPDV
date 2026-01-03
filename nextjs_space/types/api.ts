import {
  Prisma,
  Product,
  Sale,
  SaleItem,
  User,
  MovimentacaoEstoque,
  MovimentacaoCaixa,
  Caixa,
  Lote,
} from "@prisma/client";

export type TransactionClient = Prisma.TransactionClient;

export interface SaleItemInput {
  productId: string;
  quantidade: number;
  precoUnitario: number;
  descontoAplicado?: number;
}

// Interface para múltiplos pagamentos
export interface PaymentInput {
  method: "dinheiro" | "debito" | "credito" | "pix";
  amount: number;
}

export interface SaleInput {
  items: SaleItemInput[];
  // Novo: Array de pagamentos (prioridade)
  payments?: PaymentInput[];
  // @deprecated - Mantido para compatibilidade
  metodoPagamento?: string;
  valorRecebido?: number;
  troco?: number;
}

// Re-export commonly used types
export type {
  Product,
  Sale,
  SaleItem,
  User,
  MovimentacaoEstoque,
  MovimentacaoCaixa,
  Caixa,
  Lote,
};
