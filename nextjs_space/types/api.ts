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

export interface SaleInput {
  items: SaleItemInput[];
  metodoPagamento: string;
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
