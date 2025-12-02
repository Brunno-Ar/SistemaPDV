"use client";

import { PageHeader } from "@/components/ui/page-header";
import { MessageLoading } from "@/components/ui/message-loading";
import { useAdminDashboard } from "@/hooks/use-admin-dashboard";
import { StatsCards, StockAlerts, QuickAccess } from "./parts";
import { useSession } from "next-auth/react";
import { AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function DashboardClient() {
  const { data: session } = useSession();
  const { produtosEstoqueBaixo, lotesVencimentoProximo, stats, loading } =
    useAdminDashboard();

  const getExpirationAlert = () => {
    if (!session?.user?.vencimentoPlano) return null;

    const hoje = new Date();
    const vencimento = new Date(session.user.vencimentoPlano);
    const diffTime = vencimento.getTime() - hoje.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 3 && diffDays >= 0) {
      return (
        <Card className="mb-6 border-l-4 border-l-yellow-500 bg-yellow-50 dark:bg-yellow-900/10 border-y-yellow-200 border-r-yellow-200 dark:border-y-yellow-900/30 dark:border-r-yellow-900/30">
          <CardContent className="p-4 flex items-start gap-4">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-full">
              <AlertTriangle className="h-6 w-6 text-yellow-600 dark:text-yellow-500" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-yellow-800 dark:text-yellow-500 text-lg">
                Atenção: Assinatura Expirando
              </h3>
              <p className="text-yellow-700 dark:text-yellow-400/90">
                Sua assinatura expira em{" "}
                <span className="font-bold">
                  {diffDays === 0 ? "hoje" : `${diffDays} dias`}
                </span>
                . Entre em contato com o suporte para renovar e evitar o
                bloqueio do sistema.
              </p>
            </div>
          </CardContent>
        </Card>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-100px)]">
        <MessageLoading />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {getExpirationAlert()}
      <PageHeader title="Dashboard" description="Visão geral do sistema" />

      {/* KPI Cards first as requested */}
      <StatsCards stats={stats} />

      <QuickAccess />

      <StockAlerts
        produtosEstoqueBaixo={produtosEstoqueBaixo}
        lotesVencimentoProximo={lotesVencimentoProximo}
        topLowStock={stats?.topLowStock}
      />
    </div>
  );
}
