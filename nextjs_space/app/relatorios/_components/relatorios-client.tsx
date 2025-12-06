"use client";

import dynamic from "next/dynamic";
import { useRelatorios } from "@/hooks/use-relatorios";
import { RelatoriosFilters } from "./relatorios-filters";
import { RelatoriosStats } from "./relatorios-stats";
import { RelatoriosTable } from "./relatorios-table";
import { Skeleton } from "@/components/ui/skeleton";

// 🚀 Otimização: Lazy loading do componente de gráficos (Recharts é pesado ~200KB)
const RelatoriosCharts = dynamic(
  () => import("./relatorios-charts").then((mod) => mod.RelatoriosCharts),
  {
    loading: () => (
      <div className="space-y-6">
        <Skeleton className="w-full h-[300px] rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="w-full h-[300px] rounded-xl" />
          <Skeleton className="w-full h-[300px] rounded-xl" />
        </div>
      </div>
    ),
    ssr: false, // Gráficos não precisam de SSR
  }
);

interface RelatoriosClientProps {
  companyId?: string; // Opcional: usado pelo Master
}

export default function RelatoriosClient({
  companyId,
}: RelatoriosClientProps = {}) {
  const {
    analytics,
    recentSales,
    loading,
    dateRange,
    setDateRange,
    fetchFilteredData,
    clearFilter,
  } = useRelatorios({ companyId });

  if (loading && !analytics) {
    return (
      <div className="flex items-center justify-center h-64">
        Carregando relatórios...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <RelatoriosFilters
        dateRange={dateRange}
        setDateRange={setDateRange}
        onApplyFilter={fetchFilteredData}
        onClearFilter={clearFilter}
      />

      <RelatoriosStats analytics={analytics} />

      <RelatoriosCharts analytics={analytics} />

      <RelatoriosTable recentSales={recentSales} />
    </div>
  );
}
