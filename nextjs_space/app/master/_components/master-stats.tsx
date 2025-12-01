import { DollarSign, ShoppingBag } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface MasterStatsProps {
  faturamentoTotal: number;
  totalVendas: number;
  empresasAtivas: number;
  totalProdutos: number;
}

export function MasterStats({
  faturamentoTotal,
  totalVendas,
  empresasAtivas,
  totalProdutos,
}: MasterStatsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Faturamento Total */}
      <div className="flex flex-col gap-2 rounded-xl p-6 border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm relative overflow-hidden">
        <div className="absolute top-4 right-4 text-green-500 opacity-20">
          <DollarSign className="h-12 w-12" />
        </div>
        <p className="text-gray-600 dark:text-gray-400 text-base font-medium leading-normal z-10">
          Faturamento Total
        </p>
        <p className="text-green-600 dark:text-green-400 tracking-light text-3xl font-bold leading-tight z-10">
          {formatCurrency(faturamentoTotal)}
        </p>
      </div>

      {/* Total Vendas */}
      <div className="flex flex-col gap-2 rounded-xl p-6 border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
        <div className="flex items-center justify-between">
          <p className="text-gray-600 dark:text-gray-400 text-base font-medium leading-normal">
            Total de Vendas
          </p>
          <ShoppingBag className="h-5 w-5 text-blue-500" />
        </div>
        <p className="text-gray-900 dark:text-white tracking-light text-3xl font-bold leading-tight">
          {totalVendas}
        </p>
      </div>

      {/* Empresas Ativas */}
      <div className="flex flex-col gap-2 rounded-xl p-6 border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
        <p className="text-gray-600 dark:text-gray-400 text-base font-medium leading-normal">
          Empresas Ativas
        </p>
        <p className="text-gray-900 dark:text-white tracking-light text-3xl font-bold leading-tight">
          {empresasAtivas}
        </p>
      </div>

      {/* Produtos Cadastrados */}
      <div className="flex flex-col gap-2 rounded-xl p-6 border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
        <p className="text-gray-600 dark:text-gray-400 text-base font-medium leading-normal">
          Produtos Cadastrados
        </p>
        <p className="text-gray-900 dark:text-white tracking-light text-3xl font-bold leading-tight">
          {totalProdutos}
        </p>
      </div>
    </div>
  );
}
