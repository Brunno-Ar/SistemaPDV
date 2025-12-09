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
    undefined
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        // 🚀 Otimização: Buscar TODOS os dados em paralelo
        // Isso inclui analytics, caixa e avisos
        const [resAnalytics, resCaixa, _] = await Promise.all([
          fetch("/api/employee/analytics"),
          fetch("/api/caixa", { cache: "no-store" }),
          fetch("/api/avisos"),
        ]);

        if (resAnalytics.ok) {
          const json = await resAnalytics.json();
          setData(json);
        }

        // 🚀 Armazenar dados do caixa para passar ao MeuCaixa
        if (resCaixa.ok) {
          const caixaJson = await resCaixa.json();
          setCaixaData(caixaJson.caixaAberto || null);
        } else {
          setCaixaData(null);
        }

        // Os dados de avisos são usados pelo MuralAvisos
        // Ele tem seu próprio estado interno, mas agora o servidor já tem os dados em cache
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
