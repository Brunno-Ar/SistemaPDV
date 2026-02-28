import { ReactNode } from "react";
import { formatCurrency } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ShoppingCart, Calendar, Package, DollarSign } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Bar,
} from "recharts";
import Link from "next/link";
import { InteractiveHoverButton } from "@/components/ui/interactive-hover-button";
import { MuralAvisos } from "@/components/mural-avisos";
import { MeuCaixa } from "@/app/(funcionario)/dashboard/_components/meu-caixa";
import { AnimatedLoadingSkeleton } from "@/components/ui/loading";
import { EmployeeOnboardingChecklist } from "@/components/features/onboarding-tour/employee-onboarding-checklist";

export interface DashboardMetrics {
  salesToday: number;
  salesMonth: number;
  totalItemsSold: number;
  weeklySales: {
    name: string;
    total: number;
  }[];
}

interface SharedDashboardProps {
  title: string;
  subtitle: string;
  metrics: DashboardMetrics | null;
  caixaData: CaixaData | null | undefined;
  loading: boolean;
  children?: ReactNode; // For extra content like stock alerts
}

export interface CaixaData {
  id: string;
  status: "ABERTO" | "FECHADO";
  saldoInicial: number;
  dataAbertura: string;
  movimentacoes: Array<{
    id: string;
    tipo: "SANGRIA" | "SUPRIMENTO" | "ABERTURA" | "VENDA";
    valor: number;
    descricao: string;
    dataHora: string;
    metodoPagamento?: string | null;
  }>;
  resumo?: {
    vendasDinheiro: number;
    vendasPix: number;
    vendasCartao: number;
    vendasCredito: number;
    vendasDebito: number;
    totalSangrias: number;
    totalSuprimentos: number;
    saldoTeoricoDinheiro: number;
    saldoTeoricoMaquininha: number;
    totalTeoricoSistema: number;
  };
}

export function SharedDashboard({
  title,
  subtitle,
  metrics,
  caixaData,
  loading,
  children,
}: SharedDashboardProps) {
  if (loading) {
    return (
      <div className="container mx-auto py-10">
        <AnimatedLoadingSkeleton />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {title}
        </h1>
        <p className="text-gray-500 dark:text-gray-400">{subtitle}</p>
      </div>

      <EmployeeOnboardingChecklist />

      {/* Caixa Widget - Passa dados pré-carregados */}
      <MeuCaixa initialData={caixaData} />

      {/* KPI Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="bg-white dark:bg-zinc-900 border-none shadow-sm rounded-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Vendas Hoje
            </CardTitle>
            <div className="h-8 w-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <ShoppingCart className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(metrics?.salesToday || 0)}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Total acumulado hoje
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-zinc-900 border-none shadow-sm rounded-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Vendas no Mês
            </CardTitle>
            <div className="h-8 w-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
              <Calendar className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(metrics?.salesMonth || 0)}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Total acumulado este mês
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-zinc-900 border-none shadow-sm rounded-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Itens Vendidos
            </CardTitle>
            <div className="h-8 w-8 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
              <Package className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {metrics?.totalItemsSold || 0}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Produtos vendidos este mês
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Area */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-7">
        {/* Shortcuts (Left - 2 cols on lg) */}
        <Card className="sm:col-span-1 lg:col-span-2 bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800 shadow-sm rounded-xl flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
              Acesso Rápido
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col gap-3 justify-center pb-6">
            <Link href="/vender" className="w-full">
              <InteractiveHoverButton className="w-full h-14 text-base bg-cta-bg hover:bg-cta-bg/90 border-cta-bg shadow-md transition-all hover:-translate-y-1 text-white">
                <span className="flex items-center justify-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Nova Venda (PDV)
                </span>
              </InteractiveHoverButton>
            </Link>
            <Link href="/minha-conta" className="w-full">
              <InteractiveHoverButton className="w-full h-12 text-sm border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-800 dark:text-gray-200">
                <span className="flex items-center justify-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Minhas Vendas
                </span>
              </InteractiveHoverButton>
            </Link>
          </CardContent>
        </Card>

        {/* Chart (Right - 5 cols on lg, full width on sm) */}
        <Card className="sm:col-span-2 lg:col-span-5 bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800 shadow-sm rounded-xl h-[280px] sm:h-[250px]">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
              Desempenho Semanal
            </CardTitle>
          </CardHeader>
          <CardContent className="pl-2 pb-2 h-[160px]">
            <div className="h-full w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics?.weeklySales || []}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#e5e7eb"
                  />
                  <XAxis
                    dataKey="name"
                    stroke="#888888"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#888888"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `R$${value}`}
                  />
                  <Tooltip
                    cursor={{ fill: "transparent" }}
                    contentStyle={{
                      backgroundColor: "#fff",
                      borderRadius: "8px",
                      border: "1px solid #e5e7eb",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    }}
                    formatter={(value: number) => [
                      formatCurrency(value),
                      "Vendas",
                    ]}
                  />
                  <Bar
                    dataKey="total"
                    fill="#137fec"
                    radius={[4, 4, 0, 0]}
                    barSize={30}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Mural de Avisos */}
      <div id="mural-avisos" className="min-h-[300px]">
        <MuralAvisos />
      </div>

      {children}
    </div>
  );
}
