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
import { Eye, List } from "lucide-react";
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
                  <TableHead>Data</TableHead>
                  <TableHead>Saldo Inicial</TableHead>
                  <TableHead>Resultado (Quebra)</TableHead>
                  <TableHead className="w-[100px] text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {caixas && caixas.length > 0 ? (
                  caixas.map((caixa: any) => {
                    const saldoInformado =
                      (Number(caixa.valorInformadoDinheiro) || 0) +
                      (Number(caixa.valorInformadoPix) || 0) +
                      (Number(caixa.valorInformadoCartao) || 0);

                    return (
                      <TableRow key={caixa.id}>
                        <TableCell>
                          {caixa.dataFechamento ? (
                            <div className="flex flex-col">
                              <span className="font-medium">
                                {format(
                                  new Date(caixa.dataFechamento),
                                  "dd/MM/yyyy",
                                  { locale: ptBR }
                                )}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {format(
                                  new Date(caixa.dataFechamento),
                                  "HH:mm",
                                  { locale: ptBR }
                                )}
                              </span>
                            </div>
                          ) : (
                            <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                              Em Aberto
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {formatCurrency(caixa.saldoInicial)}
                        </TableCell>
                        <TableCell>
                          {getQuebraBadge(caixa.quebraDeCaixa)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Sheet>
                            <SheetTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <span className="sr-only">Ver Extrato</span>
                                <List className="h-4 w-4" />
                              </Button>
                            </SheetTrigger>
                            <SheetContent className="flex flex-col h-full w-[400px] sm:w-[540px]">
                              <SheetHeader className="mb-4 space-y-4">
                                <div>
                                  <SheetTitle>Extrato do Caixa</SheetTitle>
                                  <SheetDescription>
                                    Data de Abertura:{" "}
                                    {format(
                                      new Date(caixa.dataAbertura),
                                      "dd/MM/yyyy 'às' HH:mm",
                                      { locale: ptBR }
                                    )}
                                  </SheetDescription>
                                </div>

                                <div className="p-4 bg-muted/50 rounded-lg border">
                                  <div className="flex justify-between items-center">
                                    <span className="font-medium text-muted-foreground">
                                      Saldo Inicial
                                    </span>
                                    <span className="font-semibold text-lg">
                                      {formatCurrency(caixa.saldoInicial)}
                                    </span>
                                  </div>
                                </div>
                              </SheetHeader>

                              <div className="flex-1 overflow-y-auto min-h-0 space-y-4 pr-2">
                                <h3 className="font-semibold text-sm flex items-center gap-2">
                                  Movimentações (Sangrias e Suprimentos)
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
                                      {caixa.movimentacoes && caixa.movimentacoes.length > 0 ? (
                                        caixa.movimentacoes
                                          .filter((m: any) => m.tipo !== "ABERTURA")
                                          .map((mov: any) => (
                                            <TableRow key={mov.id}>
                                              <TableCell className="text-xs">
                                                {format(
                                                  new Date(mov.dataHora),
                                                  "HH:mm",
                                                  { locale: ptBR }
                                                )}
                                              </TableCell>
                                              <TableCell>
                                                {mov.tipo === "SANGRIA" ? (
                                                  <Badge variant="destructive" className="text-[10px] px-1.5 py-0.5 h-auto">
                                                    Sangria
                                                  </Badge>
                                                ) : (
                                                  <Badge className="bg-green-600 hover:bg-green-700 text-[10px] px-1.5 py-0.5 h-auto">
                                                    Suprimento
                                                  </Badge>
                                                )}
                                              </TableCell>
                                              <TableCell className="font-medium text-xs">
                                                {formatCurrency(mov.valor)}
                                              </TableCell>
                                              <TableCell
                                                className="max-w-[120px] truncate text-xs text-muted-foreground"
                                                title={mov.descricao}
                                              >
                                                {mov.descricao || "-"}
                                              </TableCell>
                                            </TableRow>
                                          ))
                                      ) : null}

                                      {(!caixa.movimentacoes || caixa.movimentacoes.filter((m: any) => m.tipo !== "ABERTURA").length === 0) && (
                                        <TableRow>
                                          <TableCell
                                            colSpan={4}
                                            className="text-center text-muted-foreground h-24 text-sm"
                                          >
                                            Nenhuma movimentação manual.
                                          </TableCell>
                                        </TableRow>
                                      )}
                                    </TableBody>
                                  </Table>
                                </div>
                              </div>

                              <div className="mt-auto pt-6 border-t space-y-3 bg-background">
                                <h3 className="font-semibold text-sm">Resumo do Fechamento</h3>
                                <div className="space-y-2">
                                  <div className="flex justify-between items-center text-sm">
                                    <span className="text-muted-foreground">Saldo Final Informado</span>
                                    <span className="font-medium">{formatCurrency(saldoInformado)}</span>
                                  </div>

                                  <div className="flex justify-between items-center pt-2 border-t">
                                    <span className="font-semibold">Quebra Total</span>
                                    <div className="scale-110 origin-right">
                                      {getQuebraBadge(caixa.quebraDeCaixa)}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </SheetContent>
                          </Sheet>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={4}
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
