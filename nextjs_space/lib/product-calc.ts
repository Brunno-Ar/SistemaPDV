/**
 * Calcula a Margem de Contribuição (%) baseada no Preço de Venda
 * Fórmula: ((Preço Venda - Preço Custo) / Preço Venda) * 100
 * @param price - Preço de Venda
 * @param cost - Preço de Custo
 * @returns Margem em porcentagem (ex: 50.0) ou 0 se inválido
 */
export function calculateMargin(price: number, cost: number): number {
  if (!price || price <= 0) return 0;
  return ((price - cost) / price) * 100;
}
