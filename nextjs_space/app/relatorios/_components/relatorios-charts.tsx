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
  ComposedChart,
  Line,
  CartesianGrid,
  Legend
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
    <div className="space-y-6">
      {/* NOVO: Análise Financeira (Timeline) */}
      <Card className="bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-gray-100">
            Análise Financeira (Faturamento x Custo x Lucro)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Scroll horizontal para mobile */}
          <div className="w-full overflow-x-auto">
             <div className="min-w-[600px] h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={analytics?.financialTimeline || []}
                    margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                  >
                    <CartesianGrid stroke="#f5f5f5" vertical={false} />
                    <XAxis
                      dataKey="date"
                      scale="point"
                      padding={{ left: 10, right: 10 }}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={(val) => `R$${val}`} />
                    <Tooltip
                      formatter={(value: any) => formatCurrency(value)}
                      wrapperStyle={{ fontSize: 12 }}
                      contentStyle={{
                        backgroundColor: "#fff",
                        borderColor: "#e5e7eb",
                        color: "#000",
                      }}
                    />
                    <Legend wrapperStyle={{ paddingTop: "10px" }} />

                    {/* Barra de Faturamento (Verde) */}
                    <Bar dataKey="faturamento" name="Faturamento" barSize={20} fill="#22c55e" />

                    {/* Barra de Custo (Vermelho) - Grouped logic by default in ComposedChart implies separate bars if not stackedId */}
                    <Bar dataKey="custo" name="Custo" barSize={20} fill="#ef4444" />

                    {/* Linha de Lucro (Dourado) */}
                    <Line type="monotone" dataKey="lucro" name="Lucro Líquido" stroke="#eab308" strokeWidth={3} dot={{r: 4}} />
                  </ComposedChart>
                </ResponsiveContainer>
             </div>
          </div>
        </CardContent>
      </Card>

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
    </div>
  );
}
