"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  ArrowUpCircle,
  ArrowDownCircle,
  Loader2,
} from "lucide-react";
import { Analytics } from "@/hooks/use-relatorios";

interface CashFlowStatsProps {
  analytics: Analytics | null;
  dateRange: { startDate: string; endDate: string };
  refreshKey?: number;
}

interface ExpensesSummary {
  total: number;
  count: number;
  byCategory: Record<string, number>;
}

export function CashFlowStats({
  analytics,
  dateRange,
  refreshKey = 0,
}: CashFlowStatsProps) {
  const [expenses, setExpenses] = useState<ExpensesSummary | null>(null);
  const [loadingExpenses, setLoadingExpenses] = useState(false);

  const formatCurrency = (value: number) => `R$ ${value.toFixed(2)}`;

  // Buscar despesas quando mudar o período ou refreshKey
  useEffect(() => {
    async function fetchExpenses() {
      setLoadingExpenses(true);
      try {
        const params = new URLSearchParams();
        if (dateRange.startDate) {
          params.set("from", dateRange.startDate);
        }
        if (dateRange.endDate) {
          params.set("to", dateRange.endDate);
        }

        const res = await fetch(`/api/expenses?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setExpenses(data.summary);
        }
      } catch (error) {
        console.error("Erro ao buscar despesas:", error);
      } finally {
        setLoadingExpenses(false);
      }
    }

    fetchExpenses();
  }, [dateRange, refreshKey]);

  // Calcular valores do fluxo de caixa
  const hasFiltro = analytics?.filtroAtivo;

  // Entradas = Vendas do período
  const entradas = hasFiltro
    ? analytics?.totalVendasPeriodo || 0
    : analytics?.totalVendasMes || 0;

  // Saídas = Despesas do período
  const saidas = expenses?.total || 0;

  // Saldo = Entradas - Saídas
  const saldo = entradas - saidas;
  const isPositive = saldo >= 0;

  // Calcular distribuição de despesas por categoria
  const categoryLabels: Record<string, string> = {
    ESTOQUE: "🛒 Compras de Estoque",
    OPERACIONAL: "⚙️ Operacional",
    PESSOAL: "👥 Pessoal/Salários",
    OUTROS: "📦 Outros",
  };

  return (
    <div className="space-y-6">
      {/* Cards Principais do Fluxo de Caixa */}
      <div>
        <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Wallet className="h-5 w-5 text-blue-500" />
          Fluxo de Caixa {hasFiltro ? "do Período" : "do Mês"}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Entradas */}
          <Card className="bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-900/30">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-green-900 dark:text-green-200">
                💵 Entradas (Vendas)
              </CardTitle>
              <ArrowUpCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                {formatCurrency(entradas)}
              </div>
              <p className="text-xs text-green-600 dark:text-green-400">
                {hasFiltro
                  ? `${analytics?.transacoesPeriodo || 0} vendas`
                  : `${analytics?.transacoesMes || 0} vendas no mês`}
              </p>
            </CardContent>
          </Card>

          {/* Saídas */}
          <Card className="bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-900/30">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-red-900 dark:text-red-200">
                💸 Saídas (Despesas)
              </CardTitle>
              <ArrowDownCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
            </CardHeader>
            <CardContent>
              {loadingExpenses ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin text-red-500" />
                  <span className="text-red-600">Carregando...</span>
                </div>
              ) : (
                <>
                  <div className="text-2xl font-bold text-red-700 dark:text-red-300">
                    {formatCurrency(saidas)}
                  </div>
                  <p className="text-xs text-red-600 dark:text-red-400">
                    {expenses?.count || 0} despesas registradas
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          {/* Saldo */}
          <Card
            className={
              isPositive
                ? "bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-900/30"
                : "bg-orange-50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-900/30"
            }
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle
                className={`text-sm font-medium ${
                  isPositive
                    ? "text-emerald-900 dark:text-emerald-200"
                    : "text-orange-900 dark:text-orange-200"
                }`}
              >
                💰 Saldo do Período
              </CardTitle>
              {isPositive ? (
                <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <TrendingDown className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              )}
            </CardHeader>
            <CardContent>
              <div
                className={`text-2xl font-bold ${
                  isPositive
                    ? "text-emerald-700 dark:text-emerald-300"
                    : "text-orange-700 dark:text-orange-300"
                }`}
              >
                {isPositive ? "+" : ""}
                {formatCurrency(saldo)}
              </div>
              <p
                className={`text-xs ${
                  isPositive
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-orange-600 dark:text-orange-400"
                }`}
              >
                {isPositive ? "Lucro operacional ✓" : "Déficit no período ⚠️"}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Detalhamento por Categoria de Despesa */}
      {expenses && Object.keys(expenses.byCategory).length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-gray-100">
            📊 Despesas por Categoria
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(expenses.byCategory).map(([category, value]) => {
              const percentage =
                expenses.total > 0 ? (value / expenses.total) * 100 : 0;
              return (
                <Card
                  key={category}
                  className="bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800"
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {categoryLabels[category] || category}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl font-bold text-gray-900 dark:text-gray-100">
                      {formatCurrency(value)}
                    </div>
                    <div className="mt-2 h-2 bg-gray-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-red-500 rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {percentage.toFixed(1)}% do total
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Comparativo DRE vs Caixa */}
      <div>
        <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-gray-100">
          📈 Comparativo: Lucro Contábil vs Saldo Real
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-900/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-blue-900 dark:text-blue-200">
                Lucro Contábil (DRE)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-blue-700 dark:text-blue-300">
                {formatCurrency(
                  hasFiltro
                    ? analytics?.lucroPeriodo || 0
                    : analytics?.lucroMes || 0
                )}
              </div>
              <p className="text-xs text-blue-600 dark:text-blue-400">
                Baseado no custo do produto vendido
              </p>
            </CardContent>
          </Card>

          <Card
            className={
              isPositive
                ? "bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-900/30"
                : "bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-900/30"
            }
          >
            <CardHeader className="pb-2">
              <CardTitle
                className={`text-sm font-medium ${
                  isPositive
                    ? "text-green-900 dark:text-green-200"
                    : "text-red-900 dark:text-red-200"
                }`}
              >
                Saldo Real (Caixa)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className={`text-xl font-bold ${
                  isPositive
                    ? "text-green-700 dark:text-green-300"
                    : "text-red-700 dark:text-red-300"
                }`}
              >
                {isPositive ? "+" : ""}
                {formatCurrency(saldo)}
              </div>
              <p
                className={`text-xs ${
                  isPositive
                    ? "text-green-600 dark:text-green-400"
                    : "text-red-600 dark:text-red-400"
                }`}
              >
                Dinheiro que sobrou de verdade
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
