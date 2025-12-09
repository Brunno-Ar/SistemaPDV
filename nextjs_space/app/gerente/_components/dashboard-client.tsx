"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { StockAlerts } from "@/app/admin/_components/parts/StockAlerts";
import { ProductWithCategory } from "@/lib/types";
import {
  SharedDashboard,
  DashboardMetrics,
  CaixaData,
} from "@/components/dashboard/shared-dashboard";

// Interface local para lotes (com data em string como vem da API)
interface LoteVencimentoData {
  id: string;
  numeroLote: string;
  quantidade: number;
  dataValidade: string;
  produto: {
    id: string;
    nome: string;
    sku: string;
  };
}

interface DashboardData extends DashboardMetrics {
  lastSales: {
    id: string;
    valorTotal: number;
    createdAt: string;
  }[];
  avisos: {
    id: string;
    mensagem: string;
    importante: boolean;
    criadoEm: string;
  }[];
  produtosEstoqueBaixo: ProductWithCategory[];
  lotesVencimentoProximo: LoteVencimentoData[];
  topLowStock?: ProductWithCategory[];
}

interface AdminStatsResponse {
  stats?: {
    topLowStock: ProductWithCategory[];
  };
  produtosEstoqueBaixo?: ProductWithCategory[];
  lotesVencimentoProximo?: LoteVencimentoData[];
}

export default function GerenteDashboardClient() {
  const { data: session } = useSession();
  const [data, setData] = useState<DashboardData | null>(null);
  const [caixaData, setCaixaData] = useState<CaixaData | null | undefined>(
    undefined
  ); // undefined = ainda não buscou
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        // 🚀 Otimização: Buscar TODOS os dados em paralelo
        // Isso inclui analytics, dashboard-stats, caixa e avisos
        const [resAnalytics, resAdmin, resCaixa] = await Promise.all([
          fetch("/api/employee/analytics"),
          fetch("/api/admin/dashboard-stats"),
          fetch("/api/caixa", { cache: "no-store" }),
          fetch("/api/avisos"),
        ]);

        let analyticsData = {};
        let adminData: AdminStatsResponse = {};

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

        // 🚀 Armazenar dados do caixa para passar ao MeuCaixa
        if (resCaixa.ok) {
          const caixaJson = await resCaixa.json();
          setCaixaData(caixaJson.caixaAberto || null);
        } else {
          setCaixaData(null);
        }

        setData({
          salesToday: 0, // Fallbacks
          salesMonth: 0,
          totalItemsSold: 0,
          lastSales: [],
          weeklySales: [],
          avisos: [],
          ...analyticsData, // Override with analytics
          produtosEstoqueBaixo: adminData.produtosEstoqueBaixo || [],
          lotesVencimentoProximo: adminData.lotesVencimentoProximo || [],
          topLowStock: adminData.stats?.topLowStock || [],
        } as DashboardData);
      } catch (error) {
        console.error("Failed to fetch dashboard data", error);
        setCaixaData(null); // Em caso de erro, seta como null
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

  return (
    <SharedDashboard
      title={`Painel do Gerente - ${session?.user?.name?.split(" ")[0]} 👋`}
      subtitle={formattedDate}
      metrics={data}
      caixaData={caixaData}
      loading={loading}
    >
      {/* Alertas de Estoque (Novo para Gerente) */}
      <div className="mt-2">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          Alertas de Estoque
        </h2>
        <StockAlerts
          produtosEstoqueBaixo={data?.produtosEstoqueBaixo || []}
          lotesVencimentoProximo={data?.lotesVencimentoProximo || []}
          topLowStock={data?.topLowStock}
        />
      </div>
    </SharedDashboard>
  );
}
