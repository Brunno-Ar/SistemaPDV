"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { useRelatorios } from "@/hooks/use-relatorios";
import { RelatoriosFilters } from "./relatorios-filters";
import { RelatoriosStats } from "./relatorios-stats";
import { RelatoriosTable } from "./relatorios-table";
import { CashFlowStats } from "./cash-flow-stats";
import { ExpenseDialog } from "./expense-dialog";
import {
  ChartSkeleton,
  AnimatedLoadingSkeleton,
} from "@/components/ui/loading";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { BarChart3, Wallet, PlusCircle } from "lucide-react";
import { useSession } from "next-auth/react";

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
  },
);

export type ViewMode = "EFFICIENCY" | "CASH_FLOW";

interface RelatoriosClientProps {
  companyId?: string; // Opcional: usado pelo Master
}

export default function RelatoriosClient({
  companyId,
}: RelatoriosClientProps = {}) {
  const { data: session } = useSession();
  const [viewMode, setViewMode] = useState<ViewMode>("EFFICIENCY");
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [expenseRefreshKey, setExpenseRefreshKey] = useState(0);

  const {
    analytics,
    recentSales,
    loading,
    dateRange,
    setDateRange,
    fetchFilteredData,
    clearFilter,
  } = useRelatorios({ companyId });

  // Verifica se o usuário pode criar despesas (admin ou master)
  const canCreateExpense =
    session?.user?.role === "admin" || session?.user?.role === "master";

  const handleExpenseCreated = () => {
    setExpenseDialogOpen(false);
    setExpenseRefreshKey((prev) => prev + 1);
    // Só recarrega dados filtrados se houver datas selecionadas
    if (dateRange.startDate && dateRange.endDate) {
      fetchFilteredData();
    }
  };

  if (loading && !analytics) {
    return (
      <div className="container mx-auto py-10">
        <AnimatedLoadingSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com Switch de Modo */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <Tabs
          value={viewMode}
          onValueChange={(v) => setViewMode(v as ViewMode)}
          className="w-full sm:w-auto"
        >
          <TabsList className="grid w-full grid-cols-2 sm:w-[400px]">
            <TabsTrigger value="EFFICIENCY" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Eficiência</span>
              <span className="sm:hidden">DRE</span>
            </TabsTrigger>
            <TabsTrigger value="CASH_FLOW" className="flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              <span className="hidden sm:inline">Fluxo de Caixa</span>
              <span className="sm:hidden">Caixa</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Botão Nova Despesa (apenas no modo Fluxo de Caixa e para admin/master) */}
        {viewMode === "CASH_FLOW" && canCreateExpense && (
          <Button
            onClick={() => setExpenseDialogOpen(true)}
            className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white"
          >
            <PlusCircle className="h-4 w-4 mr-2" />
            Registrar Saída
          </Button>
        )}
      </div>

      {/* Subtítulo explicativo */}
      <p className="text-sm text-muted-foreground -mt-2">
        {viewMode === "EFFICIENCY" ? (
          <>
            <strong>Modo Eficiência (DRE):</strong> Analisa a margem de lucro
            sobre o custo dos produtos vendidos.
          </>
        ) : (
          <>
            <strong>Modo Fluxo de Caixa:</strong> Analisa entradas (vendas) vs
            saídas (despesas) de dinheiro.
          </>
        )}
      </p>

      <RelatoriosFilters
        dateRange={dateRange}
        setDateRange={setDateRange}
        onApplyFilter={fetchFilteredData}
        onClearFilter={clearFilter}
      />

      {/* Renderização condicional baseada no modo */}
      {viewMode === "EFFICIENCY" ? (
        <>
          <RelatoriosStats analytics={analytics} />
          <RelatoriosCharts analytics={analytics} />
        </>
      ) : (
        <CashFlowStats
          analytics={analytics}
          dateRange={dateRange}
          refreshKey={expenseRefreshKey}
        />
      )}

      <RelatoriosTable recentSales={recentSales} />

      {/* Dialog para criar despesa */}
      <ExpenseDialog
        open={expenseDialogOpen}
        onOpenChange={setExpenseDialogOpen}
        onSuccess={handleExpenseCreated}
      />
    </div>
  );
}
