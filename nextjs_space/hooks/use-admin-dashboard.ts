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
  topLowStock?: Product[]; // New field from API
  diasParaVencimento?: number | null; // New field from API
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
    [],
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
      // 🚀 Otimização: Executar todas as chamadas em paralelo
      const [estoqueBaixoResponse, vencimentoResponse, statsResponse] =
        await Promise.all([
          fetch("/api/admin/estoque-baixo"),
          fetch("/api/admin/vencimento-proximo"),
          fetch("/api/admin/dashboard-stats"),
        ]);

      // Processar respostas
      if (estoqueBaixoResponse.ok) {
        const estoqueBaixoData = await estoqueBaixoResponse.json();
        setProdutosEstoqueBaixo(estoqueBaixoData);
      }

      if (vencimentoResponse.ok) {
        const vencimentoData = await vencimentoResponse.json();
        setLotesVencimentoProximo(vencimentoData);
      }

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData.stats);
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
