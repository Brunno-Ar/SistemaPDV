import Dexie, { Table } from "dexie";

export interface ProductLocal {
  id: string;
  nome: string;
  sku: string;
  precoVenda: number;
  estoqueAtual: number;
  imagemUrl?: string | null;
}

export interface OfflineSale {
  id?: number;
  payload: any;
  timestamp: number;
}

export class FlowPDVDatabase extends Dexie {
  products!: Table<ProductLocal, string>;
  offlineSales!: Table<OfflineSale, number>;

  constructor() {
    super("FlowPDVDB");
    this.version(1).stores({
      products: "id, nome, sku", // id is primary key
      offlineSales: "++id, timestamp",
    });
  }
}

export const db = new FlowPDVDatabase();
