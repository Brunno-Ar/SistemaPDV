"use client";

import { PageHeader } from "@/components/ui/page-header";
import { MessageLoading } from "@/components/ui/message-loading";
import { useAdminDashboard } from "@/hooks/use-admin-dashboard";
import { StatsCards, StockAlerts, QuickAccess } from "./parts";

export default function DashboardClient() {
  const { produtosEstoqueBaixo, lotesVencimentoProximo, stats, loading } =
    useAdminDashboard();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-100px)]">
        <MessageLoading />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" description="Visão geral do sistema" />

      <StockAlerts
        produtosEstoqueBaixo={produtosEstoqueBaixo}
        lotesVencimentoProximo={lotesVencimentoProximo}
      />

      <StatsCards stats={stats} />

      <QuickAccess />
    </div>
  );
}
