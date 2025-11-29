"use client";

import { useRelatorios } from "@/hooks/use-relatorios";
import { RelatoriosFilters } from "./relatorios-filters";
import { RelatoriosStats } from "./relatorios-stats";
import { RelatoriosCharts } from "./relatorios-charts";
import { RelatoriosTable } from "./relatorios-table";

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
