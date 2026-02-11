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
  Legend,
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
          {/* Scroll horizontal para mobile, com scrollbar escondida */}
          <div className="w-full overflow-x-auto scrollbar-hide">
            <div className="min-w-[600px] h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={analytics?.financialTimeline || []}
                  margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                >
                  {/* Grid mais sutil */}
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#E5E7EB"
                  />

                  {/* Eixos mais limpos */}
                  <XAxis
                    dataKey="date"
                    scale="point"
                    padding={{ left: 10, right: 10 }}
                    tick={{ fontSize: 12, fill: "#6B7280" }}
                    axisLine={false}
                    tickLine={false}
                    dy={10}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: "#6B7280" }}
                    tickFormatter={(val) => `R$${val}`}
                    axisLine={false}
                    tickLine={false}
                  />

                  {/* Tooltip melhorado */}
                  <Tooltip
                    formatter={(value: any) => formatCurrency(value)}
                    wrapperStyle={{ outline: "none" }}
                    contentStyle={{
                      backgroundColor: "#fff",
                      borderColor: "#E5E7EB",
                      borderRadius: "8px",
                      boxShadow:
                        "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                      color: "#111827",
                      fontSize: "12px",
                      padding: "8px 12px",
                    }}
                    cursor={{ fill: "#F3F4F6" }}
                  />
                  <Legend
                    wrapperStyle={{ paddingTop: "20px" }}
                    iconType="circle"
                  />

                  {/* Barra de Faturamento (Verde) com cantos arredondados */}
                  <Bar
                    dataKey="faturamento"
                    name="Faturamento"
                    barSize={20}
                    fill="#22c55e"
                    radius={[4, 4, 0, 0]}
                  />

                  {/* Barra de Custo (Vermelho) com cantos arredondados */}
                  <Bar
                    dataKey="custo"
                    name="Custo"
                    barSize={20}
                    fill="#ef4444"
                    radius={[4, 4, 0, 0]}
                  />

                  {/* Linha de Lucro (Dourado) mais suave */}
                  <Line
                    type="monotone"
                    dataKey="lucro"
                    name="Lucro Líquido"
                    stroke="#eab308"
                    strokeWidth={3}
                    dot={{
                      r: 4,
                      fill: "#eab308",
                      strokeWidth: 2,
                      stroke: "#fff",
                    }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
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
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#E5E7EB"
                />
                <XAxis
                  dataKey="nome"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 10, fill: "#6B7280" }}
                  interval="preserveStartEnd"
                  dy={5}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 10, fill: "#6B7280" }}
                />
                <Tooltip
                  formatter={(value: any) => [value, "Quantidade"]}
                  cursor={{ fill: "#F3F4F6" }}
                  wrapperStyle={{ outline: "none" }}
                  contentStyle={{
                    backgroundColor: "#fff",
                    borderColor: "#E5E7EB",
                    borderRadius: "8px",
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                    color: "#000",
                    fontSize: "12px",
                  }}
                />
                <Bar
                  dataKey="totalVendido"
                  fill="#60B5FF"
                  name="Quantidade"
                  radius={[4, 4, 0, 0]}
                />
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
                  innerRadius={50} // Donut chart looks cleaner
                  paddingAngle={5}
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
                      strokeWidth={0}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: any) => formatCurrency(value)}
                  wrapperStyle={{ outline: "none" }}
                  contentStyle={{
                    backgroundColor: "#fff",
                    borderColor: "#E5E7EB",
                    borderRadius: "8px",
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                    color: "#000",
                    fontSize: "12px",
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
