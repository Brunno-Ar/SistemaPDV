"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from "recharts";
import {
  DollarSign,
  ShoppingBag,
  TrendingUp,
  Package,
  Calendar,
  Users,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Analytics {
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
}

interface RecentSale {
  id: string;
  dataHora: string;
  user: { nome: string };
  valorTotal: number;
  custoTotal: number;
  lucro: number;
  margem: number;
  metodoPagamento: string;
}

interface RelatoriosClientProps {
  companyId?: string; // Opcional: usado pelo Master
}

export default function RelatoriosClient({
  companyId,
}: RelatoriosClientProps = {}) {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [recentSales, setRecentSales] = useState<RecentSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    startDate: "",
    endDate: "",
  });

  useEffect(() => {
    fetchAnalytics();
    fetchRecentSales();
  }, [companyId]); // Re-fetch quando companyId mudar

  const fetchAnalytics = async () => {
    try {
      // 🔥 Incluir companyId se fornecido
      const url = companyId
        ? `/api/admin/analytics?companyId=${companyId}`
        : "/api/admin/analytics";

      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao carregar analytics");
      }

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
  };

  const fetchRecentSales = async () => {
    try {
      // 🔥 Incluir companyId se fornecido
      const url = companyId
        ? `/api/admin/sales?companyId=${companyId}`
        : "/api/admin/sales";

      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao carregar vendas");
      }

      // Ensure data is an array
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
  };

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

    // Buscar dados sem filtros (padrão)
    fetchAnalytics();
    fetchRecentSales();
  };

  if (loading && !analytics) {
    return (
      <div className="flex items-center justify-center h-64">
        Carregando relatórios...
      </div>
    );
  }

  const methodColors = {
    dinheiro: "#60B5FF",
    debito: "#FF9149",
    credito: "#FF9898",
    pix: "#80D8C3",
  };

  const formatCurrency = (value: number) => `R$ ${value.toFixed(2)}`;

  return (
    <div className="space-y-6">
      {/* Filtros de Data */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros de Período</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <Label htmlFor="startDate">Data Inicial</Label>
              <Input
                id="startDate"
                type="date"
                value={dateRange.startDate}
                onChange={(e) =>
                  setDateRange({ ...dateRange, startDate: e.target.value })
                }
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <Label htmlFor="endDate">Data Final</Label>
              <Input
                id="endDate"
                type="date"
                value={dateRange.endDate}
                onChange={(e) =>
                  setDateRange({ ...dateRange, endDate: e.target.value })
                }
              />
            </div>
            <Button onClick={fetchFilteredData}>Aplicar Filtro</Button>
            <Button variant="outline" onClick={clearFilter}>
              Limpar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Cards de Resumo - Vendas */}
      <div>
        <h3 className="text-lg font-semibold mb-3">📊 Faturamento</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Vendas Hoje</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(analytics?.totalVendasHoje || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                {analytics?.transacoesHoje || 0} transações
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Vendas Semana
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(analytics?.totalVendasSemana || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                {analytics?.transacoesSemana || 0} transações
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Vendas Mês</CardTitle>
              <ShoppingBag className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(analytics?.totalVendasMes || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                {analytics?.transacoesMes || 0} transações
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Cards de Lucro */}
      <div>
        <h3 className="text-lg font-semibold mb-3">💰 Lucro Líquido</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card className="bg-green-50 border-green-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-green-900">
                Lucro Hoje
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-700">
                {formatCurrency(analytics?.lucroHoje || 0)}
              </div>
              <p className="text-xs text-green-600">
                Margem: {(analytics?.margemHoje || 0).toFixed(1)}%
              </p>
            </CardContent>
          </Card>

          <Card className="bg-green-50 border-green-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-green-900">
                Lucro Semana
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-700">
                {formatCurrency(analytics?.lucroSemana || 0)}
              </div>
              <p className="text-xs text-green-600">
                Margem: {(analytics?.margemSemana || 0).toFixed(1)}%
              </p>
            </CardContent>
          </Card>

          <Card className="bg-green-50 border-green-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-green-900">
                Lucro Mês
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-700">
                {formatCurrency(analytics?.lucroMes || 0)}
              </div>
              <p className="text-xs text-green-600">
                Margem: {(analytics?.margemMes || 0).toFixed(1)}%
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Produtos Mais Vendidos */}
        <Card>
          <CardHeader>
            <CardTitle>Produtos Mais Vendidos</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics?.produtosMaisVendidos || []}>
                <XAxis
                  dataKey="nome"
                  tickLine={false}
                  tick={{ fontSize: 10 }}
                  interval="preserveStartEnd"
                />
                <YAxis tickLine={false} tick={{ fontSize: 10 }} />
                <Tooltip
                  formatter={(value: any) => [value, "Quantidade"]}
                  wrapperStyle={{ fontSize: 11 }}
                />
                <Bar dataKey="totalVendido" fill="#60B5FF" name="Quantidade" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Vendas por Método */}
        <Card>
          <CardHeader>
            <CardTitle>Vendas por Método de Pagamento</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analytics?.vendasPorMetodo || []}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="valor"
                  nameKey="metodo"
                  label={(entry: any) =>
                    `${entry.metodo}: ${formatCurrency(entry.valor)}`
                  }
                >
                  {analytics?.vendasPorMetodo?.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        methodColors[
                          entry.metodo as keyof typeof methodColors
                        ] || "#8884d8"
                      }
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: any) => formatCurrency(value)}
                  wrapperStyle={{ fontSize: 11 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Histórico de Vendas */}
      <Card>
        <CardHeader>
          <CardTitle>Vendas Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data/Hora</TableHead>
                <TableHead>Vendedor</TableHead>
                <TableHead>Valor Total</TableHead>
                <TableHead>Custo</TableHead>
                <TableHead>Lucro</TableHead>
                <TableHead>Margem</TableHead>
                <TableHead>Método</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentSales?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <Calendar className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                    <p className="text-gray-500">Nenhuma venda encontrada</p>
                  </TableCell>
                </TableRow>
              ) : (
                recentSales?.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell>
                      {new Date(sale.dataHora).toLocaleString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </TableCell>
                    <TableCell>{sale.user?.nome || "N/A"}</TableCell>
                    <TableCell className="font-semibold">
                      {formatCurrency(sale.valorTotal)}
                    </TableCell>
                    <TableCell className="text-red-600">
                      {formatCurrency(sale.custoTotal || 0)}
                    </TableCell>
                    <TableCell className="font-semibold text-green-600">
                      {formatCurrency(sale.lucro || 0)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          sale.margem > 30
                            ? "default"
                            : sale.margem > 15
                            ? "secondary"
                            : "destructive"
                        }
                      >
                        {(sale.margem || 0).toFixed(1)}%
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        style={{
                          backgroundColor:
                            methodColors[
                              sale.metodoPagamento as keyof typeof methodColors
                            ] || "#gray",
                          color: "white",
                        }}
                      >
                        {sale.metodoPagamento.toUpperCase()}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
