"use server";

import { prisma } from "@/lib/db";

/**
 * Gera um SKU único para um produto
 * Formato: XXX-000000 (3 letras + 6 números)
 * @param empresaId - ID da empresa para verificar unicidade
 * @returns SKU único gerado
 */
export async function generateUniqueSKU(empresaId?: string): Promise<string> {
  let sku = "";
  let exists = true;

  while (exists) {
    // Gerar SKU: 3 letras maiúsculas + 6 dígitos
    const letters = Array(3)
      .fill(null)
      .map(() => String.fromCharCode(65 + Math.floor(Math.random() * 26)))
      .join("");

    const numbers = Array(6)
      .fill(null)
      .map(() => Math.floor(Math.random() * 10))
      .join("");

    sku = `${letters}-${numbers}`;

    // Verificar se já existe (globalmente ou por empresa)
    const existingProduct = await prisma.product.findFirst({
      where: empresaId ? { sku, empresaId } : { sku },
    });

    exists = !!existingProduct;
  }

  return sku;
}
