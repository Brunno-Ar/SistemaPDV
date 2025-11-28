"use client";

import { InteractiveHoverButton } from "@/components/ui/interactive-hover-button";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  Package,
  ShoppingCart,
  TrendingUp,
  DollarSign,
  ArrowRight,
  Calendar,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import Link from "next/link";

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

export default function DashboardClient() {
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-600">Carregando dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="pt-4">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Visão geral do sistema</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Alertas de Estoque Baixo */}
        {produtosEstoqueBaixo.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <h3 className="text-lg font-semibold text-red-900">
                Estoque Baixo ({produtosEstoqueBaixo.length})
              </h3>
            </div>
            <div className="space-y-2">
              {produtosEstoqueBaixo.slice(0, 3).map((produto) => (
                <div
                  key={produto.id}
                  className="flex items-center justify-between bg-white p-3 rounded-lg border border-red-100"
                >
                  <div>
                    <p className="font-medium text-gray-900">{produto.nome}</p>
                    <p className="text-sm text-gray-600">SKU: {produto.sku}</p>
                  </div>
                  <Badge variant="destructive">
                    {produto.estoqueAtual} / {produto.estoqueMinimo} un.
                  </Badge>
                </div>
              ))}
              {produtosEstoqueBaixo.length > 3 && (
                <Link href="/estoque?filter=low_stock">
                  <InteractiveHoverButton className="w-full mt-2 bg-white hover:bg-red-50 text-red-700 border-red-200">
                    Ver todos
                  </InteractiveHoverButton>
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Alertas de Vencimento Próximo */}
        {lotesVencimentoProximo.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-5 w-5 text-yellow-600" />
              <h3 className="text-lg font-semibold text-yellow-900">
                Vencimento Próximo ({lotesVencimentoProximo.length})
              </h3>
            </div>
            <div className="space-y-2">
              {lotesVencimentoProximo.slice(0, 3).map((lote) => {
                const diasParaVencer = Math.ceil(
                  (new Date(lote.dataValidade).getTime() -
                    new Date().getTime()) /
                    (1000 * 60 * 60 * 24)
                );
                return (
                  <div
                    key={lote.id}
                    className="flex items-center justify-between bg-white p-3 rounded-lg border border-yellow-100"
                  >
                    <div>
                      <p className="font-medium text-gray-900">
                        {lote.produto.nome}
                      </p>
                      <p className="text-sm text-gray-600">
                        Vence em:{" "}
                        {new Date(lote.dataValidade).toLocaleDateString(
                          "pt-BR"
                        )}{" "}
                        (<strong>{diasParaVencer} dias</strong>)
                      </p>
                    </div>
                    <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">
                      {lote.quantidade} un.
                    </Badge>
                  </div>
                );
              })}
              {lotesVencimentoProximo.length > 3 && (
                <Link href="/lotes">
                  <InteractiveHoverButton className="w-full mt-2 bg-white hover:bg-yellow-50 text-yellow-700 border-yellow-200">
                    Ver todos
                  </InteractiveHoverButton>
                </Link>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total de Produtos */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total de Produtos
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.totalProdutos || 0}
            </div>
            {stats?.produtosEstoqueBaixo ? (
              <p className="text-xs text-red-600 mt-1">
                {stats.produtosEstoqueBaixo} com estoque baixo
              </p>
            ) : (
              <p className="text-xs text-green-600 mt-1">
                Todos os estoques OK
              </p>
            )}
          </CardContent>
        </Card>

        {/* Vendas Hoje */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vendas Hoje</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.vendasHoje || 0}</div>
            <p className="text-xs text-gray-600 mt-1">
              {stats?.vendasSemana || 0} vendas esta semana
            </p>
          </CardContent>
        </Card>

        {/* Receita Hoje */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Hoje</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              R$ {(stats?.receitaHoje || 0).toFixed(2)}
            </div>
            <p className="text-xs text-gray-600 mt-1">
              R$ {(stats?.receitaSemana || 0).toFixed(2)} esta semana
            </p>
          </CardContent>
        </Card>

        {/* Lucro Hoje */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lucro Hoje</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              R$ {(stats?.lucroHoje || 0).toFixed(2)}
            </div>
            <p className="text-xs text-gray-600 mt-1">
              R$ {(stats?.lucroSemana || 0).toFixed(2)} esta semana
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Acesso Rápido */}
      <Card>
        <CardHeader>
          <CardTitle>Acesso Rápido</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link href="/vender">
              <InteractiveHoverButton className="w-full h-24 text-lg border-gray-200">
                <span className="flex flex-col items-center justify-center gap-2">
                  <ShoppingCart className="h-8 w-8" />
                  <span>Nova Venda</span>
                </span>
              </InteractiveHoverButton>
            </Link>
            <Link href="/estoque">
              <InteractiveHoverButton className="w-full h-24 text-lg border-gray-200">
                <span className="flex flex-col items-center justify-center gap-2">
                  <Package className="h-8 w-8" />
                  <span>Gerenciar Estoque</span>
                </span>
              </InteractiveHoverButton>
            </Link>
            <Link href="/relatorios">
              <InteractiveHoverButton className="w-full h-24 text-lg border-gray-200">
                <span className="flex flex-col items-center justify-center gap-2">
                  <Calendar className="h-8 w-8" />
                  <span>Relatórios</span>
                </span>
              </InteractiveHoverButton>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
