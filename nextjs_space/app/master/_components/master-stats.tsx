import { DollarSign, TrendingUp, AlertOctagon, Activity } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface MasterStatsProps {
  faturamentoTotal: number;
  empresasAtivas: number;
  mrr: number;
  inadimplentesCount: number;
}

export function MasterStats({
  faturamentoTotal,
  empresasAtivas,
  mrr,
  inadimplentesCount,
}: MasterStatsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* MRR */}
      <div className="flex flex-col gap-2 rounded-xl p-6 border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm relative overflow-hidden">
        <div className="absolute top-4 right-4 text-emerald-500 opacity-20">
          <TrendingUp className="h-12 w-12" />
        </div>
        <p className="text-gray-600 dark:text-gray-400 text-base font-medium leading-normal z-10">
          Receita Recorrente (MRR)
        </p>
        <p className="text-emerald-600 dark:text-emerald-400 tracking-light text-3xl font-bold leading-tight z-10">
          {formatCurrency(mrr)}
        </p>
      </div>

      {/* Faturamento Total */}
      <div className="flex flex-col gap-2 rounded-xl p-6 border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm relative overflow-hidden">
        <div className="absolute top-4 right-4 text-blue-500 opacity-20">
          <DollarSign className="h-12 w-12" />
        </div>
        <p className="text-gray-600 dark:text-gray-400 text-base font-medium leading-normal z-10">
          Faturamento Total
        </p>
        <p className="text-gray-900 dark:text-white tracking-light text-3xl font-bold leading-tight z-10">
          {formatCurrency(faturamentoTotal)}
        </p>
      </div>

      {/* Inadimplência */}
      <div className="flex flex-col gap-2 rounded-xl p-6 border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm relative overflow-hidden">
        <div className="absolute top-4 right-4 text-red-500 opacity-20">
          <AlertOctagon className="h-12 w-12" />
        </div>
        <p className="text-gray-600 dark:text-gray-400 text-base font-medium leading-normal z-10">
          Inadimplência
        </p>
        <p className="text-red-600 dark:text-red-400 tracking-light text-3xl font-bold leading-tight z-10">
          {inadimplentesCount}
        </p>
      </div>

      {/* Empresas Ativas */}
      <div className="flex flex-col gap-2 rounded-xl p-6 border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm relative overflow-hidden">
        <div className="absolute top-4 right-4 text-indigo-500 opacity-20">
          <Activity className="h-12 w-12" />
        </div>
        <p className="text-gray-600 dark:text-gray-400 text-base font-medium leading-normal z-10">
          Empresas Ativas
        </p>
        <p className="text-gray-900 dark:text-white tracking-light text-3xl font-bold leading-tight z-10">
          {empresasAtivas}
        </p>
      </div>
    </div>
  );
}
