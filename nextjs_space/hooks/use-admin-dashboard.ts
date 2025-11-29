import { useState, useEffect } from "react";
import { toast } from "@/hooks/use-toast";

interface Product {
  id: string;
  nome: string;
  sku: string;
  estoqueAtual: number;
  estoqueMinimo: number;
  precoVenda: number;
  precoCompra: number;
}

interface DashboardStats {
  totalProdutos: number;
  produtosEstoqueBaixo: number;
  vendasHoje: number;
  vendasSemana: number;
  receitaHoje: number;
  receitaSemana: number;
  lucroHoje: number;
  lucroSemana: number;
}

interface LoteVencimento {
  id: string;
  numeroLote: string;
  dataValidade: string;
  quantidade: number;
  produto: {
    nome: string;
    sku: string;
  };
}

export function useAdminDashboard() {
  const [produtosEstoqueBaixo, setProdutosEstoqueBaixo] = useState<Product[]>(
    []
  );
  const [lotesVencimentoProximo, setLotesVencimentoProximo] = useState<
    LoteVencimento[]
  >([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Buscar produtos com estoque baixo
      const estoqueBaixoResponse = await fetch("/api/admin/estoque-baixo");
      if (estoqueBaixoResponse.ok) {
        const estoqueBaixoData = await estoqueBaixoResponse.json();
        setProdutosEstoqueBaixo(estoqueBaixoData);
      }

      // Buscar lotes com vencimento próximo
      const vencimentoResponse = await fetch("/api/admin/vencimento-proximo");
      if (vencimentoResponse.ok) {
        const vencimentoData = await vencimentoResponse.json();
        setLotesVencimentoProximo(vencimentoData);
      }

      // Buscar estatísticas do dashboard
      const statsResponse = await fetch("/api/admin/dashboard-stats");
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData);
      }
    } catch (error) {
      console.error("Erro ao carregar dados do dashboard:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados do dashboard",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return {
    produtosEstoqueBaixo,
    lotesVencimentoProximo,
    stats,
    loading,
    refresh: fetchDashboardData,
  };
}
