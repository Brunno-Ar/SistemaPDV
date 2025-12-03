import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, ShoppingCart, DollarSign, TrendingUp } from "lucide-react";

interface DashboardStatsProps {
  stats: {
    totalProdutos: number;
    produtosEstoqueBaixo: number;
    vendasHoje: number;
    vendasSemana: number;
    receitaHoje: number;
    receitaSemana: number;
    lucroHoje: number;
    lucroSemana: number;
  } | null;
}

export function DashboardStats({ stats }: DashboardStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total de Produtos */}
      <Card id="card-produtos" className="bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-900 dark:text-gray-100">
            Total de Produtos
          </CardTitle>
          <Package className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {stats?.totalProdutos || 0}
          </div>
          {stats?.produtosEstoqueBaixo ? (
            <p className="text-xs text-red-600 dark:text-red-400 mt-1">
              {stats.produtosEstoqueBaixo} com estoque baixo
            </p>
          ) : (
            <p className="text-xs text-green-600 dark:text-green-400 mt-1">
              Todos os estoques OK
            </p>
          )}
        </CardContent>
      </Card>

      {/* Vendas Hoje */}
      <Card id="card-vendas" className="bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-900 dark:text-gray-100">
            Vendas Hoje
          </CardTitle>
          <ShoppingCart className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {stats?.vendasHoje || 0}
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            {stats?.vendasSemana || 0} vendas esta semana
          </p>
        </CardContent>
      </Card>

      {/* Receita Hoje */}
      <Card id="card-faturamento" className="bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-900 dark:text-gray-100">
            Receita Hoje
          </CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            R$ {(stats?.receitaHoje || 0).toFixed(2)}
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            R$ {(stats?.receitaSemana || 0).toFixed(2)} esta semana
          </p>
        </CardContent>
      </Card>

      {/* Lucro Hoje */}
      <Card className="bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-900 dark:text-gray-100">
            Lucro Hoje
          </CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            R$ {(stats?.lucroHoje || 0).toFixed(2)}
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            R$ {(stats?.lucroSemana || 0).toFixed(2)} esta semana
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
