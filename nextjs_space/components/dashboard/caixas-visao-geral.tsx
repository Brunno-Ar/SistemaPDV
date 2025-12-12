"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import {
  Users,
  DollarSign,
  CreditCard,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface CaixaFuncionario {
  id: string;
  funcionario: string;
  funcionarioId: string;
  funcionarioRole: "master" | "admin" | "gerente" | "caixa";
  dataAbertura: string;
  saldoInicial: number;
  dinheiroCaixa: number;
  vendas: {
    total: number;
    dinheiro: number;
    pix: number;
    cartao: number;
    quantidade: number;
  };
  sangrias: number;
  suprimentos: number;
}

interface CaixasResumo {
  totalCaixasAbertos: number;
  totalVendasDia: number;
  totalSangrias: number;
  totalSuprimentos: number;
  totalDinheiroCaixas: number;
}

interface CaixasData {
  caixas: CaixaFuncionario[];
  resumo: CaixasResumo;
}

export function CaixasVisaoGeral() {
  const [data, setData] = useState<CaixasData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Estado para ocultar caixas de administradores/gerentes
  const [ocultarAdmins, setOcultarAdmins] = useState(() => {
    // Inicializar com o valor do localStorage (se existir)
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("ocultar-caixas-admins");
      return saved === "true";
    }
    return false;
  });

  // Persistir preferência no localStorage
  useEffect(() => {
    localStorage.setItem("ocultar-caixas-admins", String(ocultarAdmins));
  }, [ocultarAdmins]);

  const fetchData = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    try {
      const res = await fetch("/api/admin/caixas", { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (error) {
      console.error("Erro ao buscar caixas:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    // Auto-refresh a cada 30 segundos
    const interval = setInterval(() => fetchData(), 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Filtrar caixas e recalcular resumo baseado no filtro
  const { caixasFiltrados, resumoFiltrado } = useMemo(() => {
    if (!data) return { caixasFiltrados: [], resumoFiltrado: null };

    const caixasFiltrados = ocultarAdmins
      ? data.caixas.filter((c) => c.funcionarioRole !== "admin")
      : data.caixas;

    // Recalcular resumo baseado apenas nos caixas filtrados
    const resumoFiltrado = {
      totalCaixasAbertos: caixasFiltrados.length,
      totalVendasDia: caixasFiltrados.reduce(
        (acc, c) => acc + c.vendas.total,
        0
      ),
      totalSangrias: caixasFiltrados.reduce((acc, c) => acc + c.sangrias, 0),
      totalSuprimentos: caixasFiltrados.reduce(
        (acc, c) => acc + c.suprimentos,
        0
      ),
      totalDinheiroCaixas: caixasFiltrados.reduce(
        (acc, c) => acc + c.dinheiroCaixa,
        0
      ),
    };

    return { caixasFiltrados, resumoFiltrado };
  }, [data, ocultarAdmins]);

  if (loading) {
    return (
      <Card className="bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800">
        <CardContent className="py-8 text-center">
          <RefreshCw className="h-6 w-6 animate-spin mx-auto text-gray-400" />
          <p className="text-muted-foreground mt-2">Carregando caixas...</p>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.caixas.length === 0) {
    return (
      <Card className="bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-500" />
            Caixas da Loja
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fetchData(true)}
            disabled={refreshing}
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            />
          </Button>
        </CardHeader>
        <CardContent className="py-6 text-center">
          <Badge variant="secondary" className="text-sm px-4 py-2">
            Nenhum caixa aberto no momento
          </Badge>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800">
      <CardHeader className="pb-2">
        <div className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-500" />
            Caixas da Loja
            <Badge variant="outline" className="ml-2">
              {resumoFiltrado?.totalCaixasAbertos || 0} aberto
              {(resumoFiltrado?.totalCaixasAbertos || 0) > 1 ? "s" : ""}
            </Badge>
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fetchData(true)}
            disabled={refreshing}
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            />
          </Button>
        </div>
        {/* Checkbox para ocultar admin/gerente */}
        <div className="flex items-center gap-2 mt-2">
          <Checkbox
            id="ocultar-admins"
            checked={ocultarAdmins}
            onCheckedChange={(checked) => setOcultarAdmins(checked === true)}
          />
          <label
            htmlFor="ocultar-admins"
            className="text-xs text-muted-foreground cursor-pointer select-none"
          >
            Ocultar caixa do Admin
          </label>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Resumo Geral */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {/* Card Dinheiro em Caixa - Destaque */}
          <div className="col-span-2 md:col-span-1 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 p-3 rounded-lg border-2 border-green-300 dark:border-green-700">
            <p className="text-xs text-green-700 dark:text-green-300 font-medium">
              💵 Dinheiro em Caixas
            </p>
            <p
              className={`text-lg font-bold ${
                (resumoFiltrado?.totalDinheiroCaixas || 0) >= 0
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-600 dark:text-red-400"
              }`}
            >
              {formatCurrency(resumoFiltrado?.totalDinheiroCaixas || 0)}
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-zinc-800 p-3 rounded-lg">
            <p className="text-xs text-muted-foreground">Vendas do Dia</p>
            <p className="text-lg font-bold text-green-600 dark:text-green-400">
              {formatCurrency(resumoFiltrado?.totalVendasDia || 0)}
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-zinc-800 p-3 rounded-lg">
            <p className="text-xs text-muted-foreground">Suprimentos</p>
            <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
              {formatCurrency(resumoFiltrado?.totalSuprimentos || 0)}
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-zinc-800 p-3 rounded-lg">
            <p className="text-xs text-muted-foreground">Sangrias</p>
            <p className="text-lg font-bold text-red-600 dark:text-red-400">
              {formatCurrency(resumoFiltrado?.totalSangrias || 0)}
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-zinc-800 p-3 rounded-lg">
            <p className="text-xs text-muted-foreground">Líquido</p>
            <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
              {formatCurrency(
                (resumoFiltrado?.totalVendasDia || 0) +
                  (resumoFiltrado?.totalSuprimentos || 0) -
                  (resumoFiltrado?.totalSangrias || 0)
              )}
            </p>
          </div>
        </div>

        {/* Lista de Funcionários com Caixa Aberto */}
        <div className="space-y-3">
          {caixasFiltrados.length === 0 && data.caixas.length > 0 ? (
            <div className="text-center py-4">
              <Badge variant="secondary" className="text-sm px-4 py-2">
                O caixa do Admin está oculto pelo filtro
              </Badge>
            </div>
          ) : caixasFiltrados.length === 0 ? (
            <div className="text-center py-4">
              <Badge variant="secondary" className="text-sm px-4 py-2">
                Nenhum caixa aberto no momento
              </Badge>
            </div>
          ) : (
            caixasFiltrados.map((caixa) => (
              <div
                key={caixa.id}
                className="border border-gray-200 dark:border-zinc-700 rounded-lg p-4 bg-gray-50 dark:bg-zinc-800/50"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
                      <span className="text-sm font-bold text-green-700 dark:text-green-400">
                        {caixa.funcionario.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        {caixa.funcionario}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Aberto às{" "}
                        {new Date(caixa.dataAbertura).toLocaleTimeString(
                          "pt-BR",
                          {
                            hour: "2-digit",
                            minute: "2-digit",
                          }
                        )}
                      </p>
                    </div>
                  </div>
                  <Badge className="bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400">
                    Aberto
                  </Badge>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-6 gap-2 text-sm">
                  {/* Dinheiro em Caixa - Destaque */}
                  <div className="col-span-2 md:col-span-1 flex items-center gap-1 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded">
                    <span className="text-green-700 dark:text-green-300 font-medium">
                      💵
                    </span>
                    <span
                      className={`font-bold ${
                        caixa.dinheiroCaixa >= 0
                          ? "text-green-600 dark:text-green-400"
                          : "text-red-600 dark:text-red-400"
                      }`}
                    >
                      {formatCurrency(caixa.dinheiroCaixa)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-4 w-4 text-gray-400" />
                    <span className="text-muted-foreground">Inicial:</span>
                    <span className="font-medium">
                      {formatCurrency(caixa.saldoInicial)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <CreditCard className="h-4 w-4 text-green-500" />
                    <span className="text-muted-foreground">Vendas:</span>
                    <span className="font-medium text-green-600">
                      {formatCurrency(caixa.vendas.total)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <TrendingUp className="h-4 w-4 text-blue-500" />
                    <span className="text-muted-foreground">Suprim:</span>
                    <span className="font-medium text-blue-600">
                      {formatCurrency(caixa.suprimentos)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <TrendingDown className="h-4 w-4 text-red-500" />
                    <span className="text-muted-foreground">Sangria:</span>
                    <span className="font-medium text-red-600">
                      {formatCurrency(caixa.sangrias)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground">Qtd:</span>
                    <span className="font-medium">
                      {caixa.vendas.quantidade} vendas
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
