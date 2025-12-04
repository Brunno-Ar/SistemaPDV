import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Calendar } from "lucide-react";
import { RecentSale } from "@/hooks/use-relatorios";

interface RelatoriosTableProps {
  recentSales: RecentSale[];
}

export function RelatoriosTable({ recentSales }: RelatoriosTableProps) {
  const formatCurrency = (value: number) => `R$ ${value.toFixed(2)}`;

  const methodColors = {
    dinheiro: "#60B5FF",
    debito: "#FF9149",
    credito: "#FF9898",
    pix: "#80D8C3",
  };

  return (
    <Card className="bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800">
      <CardHeader>
        <CardTitle className="text-gray-900 dark:text-gray-100">
          Vendas Recentes
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50 dark:bg-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-800">
              <TableHead className="text-gray-700 dark:text-gray-300">
                Data/Hora
              </TableHead>
              <TableHead className="text-gray-700 dark:text-gray-300">
                Vendedor
              </TableHead>
              <TableHead className="text-gray-700 dark:text-gray-300">
                Valor Total
              </TableHead>
              <TableHead className="text-gray-700 dark:text-gray-300">
                Custo
              </TableHead>
              <TableHead className="text-gray-700 dark:text-gray-300">
                Lucro
              </TableHead>
              <TableHead className="text-gray-700 dark:text-gray-300">
                Margem
              </TableHead>
              <TableHead className="text-gray-700 dark:text-gray-300">
                Método
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recentSales?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <Calendar className="h-12 w-12 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                  <p className="text-gray-500 dark:text-gray-400">
                    Nenhuma venda encontrada
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              recentSales?.map((sale) => (
                <TableRow
                  key={sale.id}
                  className="border-gray-200 dark:border-zinc-800"
                >
                  <TableCell className="text-gray-900 dark:text-gray-100">
                    {new Date(sale.dataHora).toLocaleString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </TableCell>
                  <TableCell className="text-gray-900 dark:text-gray-100">
                    {sale.user?.nome || "N/A"}
                  </TableCell>
                  <TableCell className="font-semibold text-gray-900 dark:text-gray-100">
                    {formatCurrency(sale.valorTotal)}
                  </TableCell>
                  <TableCell className="text-red-600 dark:text-red-400">
                    {formatCurrency(sale.custoTotal || 0)}
                  </TableCell>
                  <TableCell className="font-semibold text-green-600 dark:text-green-400">
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
        </div>
      </CardContent>
    </Card>
  );
}
