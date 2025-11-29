import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from "recharts";
import { Analytics } from "@/hooks/use-relatorios";

interface RelatoriosChartsProps {
  analytics: Analytics | null;
}

export function RelatoriosCharts({ analytics }: RelatoriosChartsProps) {
  const formatCurrency = (value: number) => `R$ ${value.toFixed(2)}`;

  const methodColors = {
    dinheiro: "#60B5FF",
    debito: "#FF9149",
    credito: "#FF9898",
    pix: "#80D8C3",
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Produtos Mais Vendidos */}
      <Card className="bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-gray-100">
            Produtos Mais Vendidos
          </CardTitle>
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
                contentStyle={{
                  backgroundColor: "#fff",
                  borderColor: "#e5e7eb",
                  color: "#000",
                }}
              />
              <Bar dataKey="totalVendido" fill="#60B5FF" name="Quantidade" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Vendas por Método */}
      <Card className="bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-gray-100">
            Vendas por Método de Pagamento
          </CardTitle>
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
                      methodColors[entry.metodo as keyof typeof methodColors] ||
                      "#8884d8"
                    }
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: any) => formatCurrency(value)}
                wrapperStyle={{ fontSize: 11 }}
                contentStyle={{
                  backgroundColor: "#fff",
                  borderColor: "#e5e7eb",
                  color: "#000",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
