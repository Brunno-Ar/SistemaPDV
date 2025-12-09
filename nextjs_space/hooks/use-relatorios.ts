import { useState, useEffect, useCallback } from "react";
import { toast } from "@/hooks/use-toast";

export interface Analytics {
  totalVendasHoje: number;
  totalVendasSemana: number;
  totalVendasMes: number;
  custoTotalHoje: number;
  custoTotalSemana: number;
  custoTotalMes: number;
  lucroHoje: number;
  lucroSemana: number;
  lucroMes: number;
  margemHoje: number;
  margemSemana: number;
  margemMes: number;
  transacoesHoje: number;
  transacoesSemana: number;
  transacoesMes: number;
  // Dados do período filtrado
  totalVendasPeriodo: number | null;
  custoTotalPeriodo: number | null;
  lucroPeriodo: number | null;
  margemPeriodo: number | null;
  transacoesPeriodo: number | null;
  filtroAtivo: boolean;
  produtosMaisVendidos: Array<{
    nome: string;
    totalVendido: number;
    valorTotal: number;
  }>;
  vendasPorMetodo: Array<{
    metodo: string;
    total: number;
    valor: number;
  }>;
  financialTimeline: Array<{
    date: string;
    faturamento: number;
    custo: number;
    lucro: number;
  }>;
}

export interface RecentSale {
  id: string;
  dataHora: string;
  user: { nome: string };
  valorTotal: number;
  custoTotal: number;
  lucro: number;
  margem: number;
  metodoPagamento: string;
}

interface UseRelatoriosProps {
  companyId?: string;
}

export function useRelatorios({ companyId }: UseRelatoriosProps = {}) {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [recentSales, setRecentSales] = useState<RecentSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    startDate: "",
    endDate: "",
  });

  const fetchAnalytics = useCallback(async () => {
    try {
      const url = companyId
        ? `/api/admin/analytics?companyId=${companyId}`
        : "/api/admin/analytics";

      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok)
        throw new Error(data.error || "Erro ao carregar analytics");

      setAnalytics(data);
    } catch (error) {
      console.error("Erro ao carregar analytics:", error);
      toast({
        title: "Erro",
        description:
          error instanceof Error ? error.message : "Erro ao carregar analytics",
        variant: "destructive",
      });
    }
  }, [companyId]);

  const fetchRecentSales = useCallback(async () => {
    try {
      const url = companyId
        ? `/api/admin/sales?companyId=${companyId}`
        : "/api/admin/sales";

      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok)
        throw new Error(data.error || "Erro ao carregar vendas");

      if (Array.isArray(data)) {
        setRecentSales(data);
      } else {
        setRecentSales([]);
      }
    } catch (error) {
      console.error("Erro ao carregar vendas recentes:", error);
      setRecentSales([]);
      toast({
        title: "Erro",
        description:
          error instanceof Error
            ? error.message
            : "Erro ao carregar vendas recentes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  const fetchFilteredData = async () => {
    if (!dateRange.startDate || !dateRange.endDate) {
      toast({
        title: "Erro",
        description: "Selecione as datas de início e fim",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      const params = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      });

      if (companyId) {
        params.append("companyId", companyId);
      }

      const [analyticsRes, salesRes] = await Promise.all([
        fetch(`/api/admin/analytics?${params}`),
        fetch(`/api/admin/sales?${params}`),
      ]);

      const analyticsData = await analyticsRes.json();
      const salesData = await salesRes.json();

      setAnalytics(analyticsData);
      setRecentSales(salesData);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao carregar dados filtrados",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const clearFilter = () => {
    setDateRange({ startDate: "", endDate: "" });
    setLoading(true);
    fetchAnalytics();
    fetchRecentSales();
  };

  useEffect(() => {
    fetchAnalytics();
    fetchRecentSales();
  }, [fetchAnalytics, fetchRecentSales]);

  return {
    analytics,
    recentSales,
    loading,
    dateRange,
    setDateRange,
    fetchFilteredData,
    clearFilter,
  };
}
