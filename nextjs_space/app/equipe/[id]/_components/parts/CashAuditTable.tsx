import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Eye } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface CashAuditTableProps {
  caixas: any[];
  formatCurrency: (value: number | string) => string;
}

export function CashAuditTable({ caixas, formatCurrency }: CashAuditTableProps) {
  const getQuebraBadge = (quebra: string | number | null) => {
    if (quebra === null) {
      return <Badge variant="secondary">Em Aberto</Badge>;
    }
    const val = Number(quebra);
    if (val === 0) {
      return <Badge className="bg-green-600 hover:bg-green-700">OK</Badge>;
    }
    if (val > 0) {
      return (
        <Badge className="bg-blue-600 hover:bg-blue-700">
          +{formatCurrency(val)}
        </Badge>
      );
    }
    return <Badge variant="destructive">{formatCurrency(val)}</Badge>;
  };

  return (
    <div className="space-y-2">
      <h2 className="text-lg font-semibold tracking-tight">
        Auditoria de Caixa (Últimos 30)
      </h2>
      <Card>
        <CardContent className="p-0">
          <ScrollArea className="w-full whitespace-nowrap rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Abertura</TableHead>
                  <TableHead>Fechamento</TableHead>
                  <TableHead>Saldo Inicial</TableHead>
                  <TableHead>Saldo Final</TableHead>
                  <TableHead>Resultado</TableHead>
                  <TableHead className="w-[100px]">Detalhes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {caixas && caixas.length > 0 ? (
                  caixas.map((caixa: any) => (
                    <TableRow key={caixa.id}>
                      <TableCell>
                        {format(
                          new Date(caixa.dataAbertura),
                          "dd/MM/yyyy HH:mm",
                          { locale: ptBR }
                        )}
                      </TableCell>
                      <TableCell>
                        {caixa.dataFechamento
                          ? format(
                              new Date(caixa.dataFechamento),
                              "dd/MM/yyyy HH:mm",
                              { locale: ptBR }
                            )
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {formatCurrency(caixa.saldoInicial)}
                      </TableCell>
                      <TableCell>
                        {caixa.saldoFinal !== null
                          ? formatCurrency(caixa.saldoFinal)
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {getQuebraBadge(caixa.quebraDeCaixa)}
                      </TableCell>
                      <TableCell>
                        <Sheet>
                          <SheetTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </SheetTrigger>
                          <SheetContent className="w-[400px] sm:w-[540px]">
                            <SheetHeader className="mb-6">
                              <SheetTitle>Extrato do Caixa</SheetTitle>
                              <SheetDescription>
                                Data:{" "}
                                {format(
                                  new Date(caixa.dataAbertura),
                                  "dd/MM/yyyy",
                                  { locale: ptBR }
                                )}
                              </SheetDescription>
                              <div className="mt-4 p-4 bg-muted rounded-lg">
                                <div className="flex justify-between items-center mb-2">
                                  <span className="font-medium">
                                    Saldo Inicial
                                  </span>
                                  <span>
                                    {formatCurrency(caixa.saldoInicial)}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center text-lg font-bold">
                                  <span>Saldo Final</span>
                                  <span>
                                    {caixa.saldoFinal !== null
                                      ? formatCurrency(caixa.saldoFinal)
                                      : "Em Aberto"}
                                  </span>
                                </div>
                              </div>
                            </SheetHeader>
                            <div className="space-y-4">
                              <h3 className="font-semibold text-sm">
                                Movimentações Manuais
                              </h3>
                              <div className="border rounded-md">
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Hora</TableHead>
                                      <TableHead>Tipo</TableHead>
                                      <TableHead>Valor</TableHead>
                                      <TableHead>Motivo</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {caixa.movimentacoes
                                      .filter(
                                        (m: any) => m.tipo !== "ABERTURA"
                                      )
                                      .map((mov: any) => (
                                        <TableRow key={mov.id}>
                                          <TableCell>
                                            {format(
                                              new Date(mov.dataHora),
                                              "HH:mm",
                                              { locale: ptBR }
                                            )}
                                          </TableCell>
                                          <TableCell>
                                            {mov.tipo === "SANGRIA" ? (
                                              <Badge variant="destructive">
                                                Sangria
                                              </Badge>
                                            ) : (
                                              <Badge className="bg-green-600 hover:bg-green-700">
                                                Suprimento
                                              </Badge>
                                            )}
                                          </TableCell>
                                          <TableCell>
                                            {formatCurrency(mov.valor)}
                                          </TableCell>
                                          <TableCell
                                            className="max-w-[150px] truncate"
                                            title={mov.descricao}
                                          >
                                            {mov.descricao || "-"}
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    {caixa.movimentacoes.filter(
                                      (m: any) => m.tipo !== "ABERTURA"
                                    ).length === 0 && (
                                      <TableRow>
                                        <TableCell
                                          colSpan={4}
                                          className="text-center text-muted-foreground h-24"
                                        >
                                          Nenhuma sangria ou suprimento.
                                        </TableCell>
                                      </TableRow>
                                    )}
                                  </TableBody>
                                </Table>
                              </div>
                            </div>
                          </SheetContent>
                        </Sheet>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center text-muted-foreground h-24"
                    >
                      Nenhum registro de caixa encontrado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
