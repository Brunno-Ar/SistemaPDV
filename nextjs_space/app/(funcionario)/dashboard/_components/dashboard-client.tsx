"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
  SharedDashboard,
  DashboardMetrics,
  CaixaData,
} from "@/components/dashboard/shared-dashboard";

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
  // metrics properties are inherited
}

export default function DashboardClient() {
  const { data: session } = useSession();
  const [data, setData] = useState<DashboardData | null>(null);
  const [caixaData, setCaixaData] = useState<CaixaData | null | undefined>(
    undefined,
  );
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      // 🚀 Otimização: Buscar TODOS os dados em paralelo
      const [resAnalytics, resCaixa] = await Promise.all([
        fetch("/api/employee/analytics"),
        fetch("/api/caixa", { cache: "no-store" }),
        // fetch("/api/avisos"), // Avisos já tem cache próprio ou não precisam de polling frequente, mas para simplificar pode ficar ou ser removido do loop crítico se pesar
      ]);

      if (resAnalytics.ok) {
        const json = await resAnalytics.json();
        setData(json);
      }

      if (resCaixa.ok) {
        const caixaJson = await resCaixa.json();
        setCaixaData(caixaJson.caixaAberto || null);
      } else {
        setCaixaData(null);
      }
    } catch (error) {
      console.error("Failed to fetch dashboard data", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(); // Initial fetch

    // Auto-refresh a cada 5 segundos
    const intervalId = setInterval(fetchData, 5000);

    return () => clearInterval(intervalId);
  }, []);

  const currentDate = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Capitalize first letter of date
  const formattedDate =
    currentDate.charAt(0).toUpperCase() + currentDate.slice(1);

  return (
    <SharedDashboard
      title={`Olá, ${session?.user?.name?.split(" ")[0]} 👋`}
      subtitle={formattedDate}
      metrics={data}
      caixaData={caixaData}
      loading={loading}
    />
  );
}
