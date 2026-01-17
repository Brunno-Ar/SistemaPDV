"use client";

import dynamic from "next/dynamic";
import { useRelatorios } from "@/hooks/use-relatorios";
import { RelatoriosFilters } from "./relatorios-filters";
import { RelatoriosStats } from "./relatorios-stats";
import { RelatoriosTable } from "./relatorios-table";
import {
  ChartSkeleton,
  AnimatedLoadingSkeleton,
} from "@/components/ui/loading";

// 🚀 Otimização: Lazy loading do componente de gráficos (Recharts é pesado ~200KB)
const RelatoriosCharts = dynamic(
  () => import("./relatorios-charts").then((mod) => mod.RelatoriosCharts),
  {
    loading: () => (
      <div className="space-y-6">
        <ChartSkeleton className="w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ChartSkeleton className="w-full" />
          <ChartSkeleton className="w-full" />
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
      <div className="container mx-auto py-10">
        <AnimatedLoadingSkeleton />
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
