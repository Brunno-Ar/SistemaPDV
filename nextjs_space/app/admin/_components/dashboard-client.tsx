"use client";

import { PageHeader } from "@/components/ui/page-header";
import { AnimatedLoadingSkeleton } from "@/components/ui/loading";
import { useAdminDashboard } from "@/hooks/use-admin-dashboard";
import { StatsCards, StockAlerts, QuickAccess } from "./parts";
import { useSession } from "next-auth/react";
import { AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { OnboardingChecklist } from "@/components/features/onboarding-tour/onboarding-checklist";

export default function DashboardClient() {
  useSession(); // Manter para reatividade da sessão
  const { produtosEstoqueBaixo, lotesVencimentoProximo, stats, loading } =
    useAdminDashboard();

  const getExpirationAlert = () => {
    // Usar dados da API se disponíveis (mais confiável) ou fallback para sessão
    // Se stats for null (carregando ou erro), não mostra nada por enquanto
    if (
      !stats ||
      stats.diasParaVencimento === null ||
      stats.diasParaVencimento === undefined
    )
      return null;

    const diffDays = stats.diasParaVencimento;

    // ALERTA AMARELO: Próximo do vencimento (1 a 7 dias)
    if (diffDays <= 7 && diffDays > 0) {
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
                <span className="font-bold">{diffDays} dias</span>. Renove para
                evitar o bloqueio.
              </p>
            </div>
          </CardContent>
        </Card>
      );
    }

    // ALERTA VERMELHO: Vencido (<= 0)
    if (diffDays <= 0) {
      return (
        <Card className="mb-6 border-l-4 border-l-red-500 bg-red-50 dark:bg-red-900/10 border-y-red-200 border-r-red-200 dark:border-y-red-900/30 dark:border-r-red-900/30">
          <CardContent className="p-4 flex items-start gap-4">
            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full">
              <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-500" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-red-800 dark:text-red-500 text-lg">
                Plano Vencido!
              </h3>
              <p className="text-red-700 dark:text-red-400/90">
                O pagamento da sua mensalidade não foi identificado. Você
                perderá o acesso em{" "}
                <span className="font-bold">
                  {Math.max(0, 10 + diffDays)} dias
                </span>
                . Entre em contato com o suporte.
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
      <div className="container mx-auto py-10">
        <AnimatedLoadingSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {getExpirationAlert()}
      <PageHeader title="Dashboard" description="Visão geral do sistema" />

      <OnboardingChecklist />

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
