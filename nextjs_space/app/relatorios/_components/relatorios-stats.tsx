import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, ShoppingBag } from "lucide-react";
import { Analytics } from "@/hooks/use-relatorios";

interface RelatoriosStatsProps {
  analytics: Analytics | null;
}

export function RelatoriosStats({ analytics }: RelatoriosStatsProps) {
  const formatCurrency = (value: number) => `R$ ${value.toFixed(2)}`;

  return (
    <div className="space-y-6">
      {/* Cards de Resumo - Vendas */}
      <div>
        <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-gray-100">
          📊 Faturamento
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card className="bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Vendas nas últimas 24 horas
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {formatCurrency(analytics?.totalVendasHoje || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                {analytics?.transacoesHoje || 0} transações
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Vendas Semana
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {formatCurrency(analytics?.totalVendasSemana || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                {analytics?.transacoesSemana || 0} transações
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Vendas Mês
              </CardTitle>
              <ShoppingBag className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {formatCurrency(analytics?.totalVendasMes || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                {analytics?.transacoesMes || 0} transações
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Cards de Lucro */}
      <div>
        <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-gray-100">
          💰 Lucro Líquido
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card className="bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-900/30">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-green-900 dark:text-green-200">
                Lucro nas últimas 24 horas
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                {formatCurrency(analytics?.lucroHoje || 0)}
              </div>
              <p className="text-xs text-green-600 dark:text-green-400">
                Margem: {(analytics?.margemHoje || 0).toFixed(1)}%
              </p>
            </CardContent>
          </Card>

          <Card className="bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-900/30">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-green-900 dark:text-green-200">
                Lucro Semana
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                {formatCurrency(analytics?.lucroSemana || 0)}
              </div>
              <p className="text-xs text-green-600 dark:text-green-400">
                Margem: {(analytics?.margemSemana || 0).toFixed(1)}%
              </p>
            </CardContent>
          </Card>

          <Card className="bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-900/30">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-green-900 dark:text-green-200">
                Lucro Mês
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                {formatCurrency(analytics?.lucroMes || 0)}
              </div>
              <p className="text-xs text-green-600 dark:text-green-400">
                Margem: {(analytics?.margemMes || 0).toFixed(1)}%
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
