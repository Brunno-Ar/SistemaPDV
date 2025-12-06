"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { ShoppingCart, Calendar, Package, DollarSign } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { InteractiveHoverButton } from "@/components/ui/interactive-hover-button";
import { MuralAvisos } from "@/components/mural-avisos";
import { MeuCaixa } from "@/app/(funcionario)/dashboard/_components/meu-caixa";
import { formatCurrency } from "@/lib/utils";
import { StockAlerts } from "@/app/admin/_components/parts/StockAlerts";

interface DashboardData {
  salesToday: number;
  salesMonth: number;
  totalItemsSold: number;
  lastSales: {
    id: string;
    valorTotal: number;
    createdAt: string;
  }[];
  weeklySales: {
    name: string;
    total: number;
  }[];
  avisos: {
    id: string;
    mensagem: string;
    importante: boolean;
    criadoEm: string;
  }[];
  produtosEstoqueBaixo: any[];
  lotesVencimentoProximo: any[];
  topLowStock?: any[];
}

export default function GerenteDashboardClient() {
  const { data: session } = useSession();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        // 🚀 Otimização: Buscar TODOS os dados em paralelo
        // Isso inclui analytics, dashboard-stats, caixa e avisos
        const [resAnalytics, resAdmin, resCaixa, resAvisos] = await Promise.all(
          [
            fetch("/api/employee/analytics"),
            fetch("/api/admin/dashboard-stats"),
            fetch("/api/caixa", { cache: "no-store" }),
            fetch("/api/avisos"),
          ]
        );

        let analyticsData = {};
        let adminData: any = {};

        if (resAnalytics.ok) {
          analyticsData = await resAnalytics.json();
        } else {
          console.error("Failed to fetch analytics data");
        }

        if (resAdmin.ok) {
          adminData = await resAdmin.json();
        } else {
          console.error("Failed to fetch admin stats");
        }

        // Os dados de caixa e avisos são usados pelos componentes MeuCaixa e MuralAvisos
        // Eles têm seu próprio estado interno, então apenas pré-aquecemos o cache
        // Os componentes vão buscar novamente, mas agora o servidor já tem os dados em cache

        setData({
          salesToday: 0,
          salesMonth: 0,
          totalItemsSold: 0,
          lastSales: [],
          weeklySales: [],
          avisos: [],
          ...analyticsData,
          produtosEstoqueBaixo: adminData.produtosEstoqueBaixo || [],
          lotesVencimentoProximo: adminData.lotesVencimentoProximo || [],
          topLowStock: adminData.stats?.topLowStock || [],
        } as DashboardData);
      } catch (error) {
        console.error("Failed to fetch dashboard data", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const currentDate = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const formattedDate =
    currentDate.charAt(0).toUpperCase() + currentDate.slice(1);

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Painel do Gerente - {session?.user?.name?.split(" ")[0]} 👋
        </h1>
        <p className="text-gray-500 dark:text-gray-400">{formattedDate}</p>
      </div>

      {/* Caixa Widget */}
      <MeuCaixa />

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
              {formatCurrency(data?.salesToday || 0)}
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
              {formatCurrency(data?.salesMonth || 0)}
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
              {data?.totalItemsSold || 0}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Produtos vendidos este mês
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Area */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-7">
        {/* Shortcuts (Left - 2 cols) */}
        <Card className="md:col-span-2 bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800 shadow-sm rounded-xl flex flex-col h-auto md:h-[220px]">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
              Acesso Rápido
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col gap-3 justify-center pb-6 md:pb-0">
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

        {/* Chart (Right - 5 cols) */}
        <Card className="md:col-span-5 bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800 shadow-sm rounded-xl h-[300px] md:h-[220px]">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
              Desempenho Semanal
            </CardTitle>
          </CardHeader>
          <CardContent className="pl-2 pb-2 h-[160px]">
            <div className="h-full w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.weeklySales || []}>
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
      <div>
        <MuralAvisos />
      </div>

      {/* Alertas de Estoque (Novo para Gerente) */}
      <div className="mt-2">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          Alertas de Estoque
        </h2>
        <StockAlerts
          produtosEstoqueBaixo={data?.produtosEstoqueBaixo || []}
          lotesVencimentoProximo={data?.lotesVencimentoProximo || []}
          topLowStock={(data as any)?.topLowStock}
        />
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="space-y-2">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-5 w-48" />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
      <div className="grid gap-4 md:grid-cols-7">
        <Skeleton className="md:col-span-2 h-[300px] rounded-xl" />
        <Skeleton className="md:col-span-5 h-[300px] rounded-xl" />
      </div>
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
}
