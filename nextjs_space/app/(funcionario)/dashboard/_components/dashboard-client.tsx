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

  const isCaixa = session?.user?.role === "caixa";

  const fetchData = async () => {
    try {
      const resAnalytics = await fetch("/api/employee/analytics");
      if (resAnalytics.ok) {
        const json = await resAnalytics.json();
        setData(json);
      }

      const resCaixa = await fetch("/api/caixa", { cache: "no-store" });
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

    // Auto-refresh desabilitado para caixa (sem polling de analytics)
    if (!isCaixa) {
      const intervalId = setInterval(fetchData, 5000);
      return () => clearInterval(intervalId);
    }
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
      escopo={session?.user?.role === "caixa" ? "proprio" : "empresa"}
    />
  );
}
