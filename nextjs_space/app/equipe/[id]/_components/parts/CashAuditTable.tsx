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
import { List } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Movimentacao {
  id: string;
  tipo: string;
  valor: number;
  descricao?: string;
  dataHora: string;
}

interface Caixa {
  id: string;
  dataAbertura: string;
  dataFechamento?: string;
  saldoInicial: number;
  quebraDeCaixa?: number | null;
  valorInformadoDinheiro?: number;
  valorInformadoPix?: number;
  valorInformadoCartao?: number;
  valorInformadoMaquininha?: number;
  movimentacoes: Movimentacao[];
  status: string;
  justificativa?: string;
}

interface CashAuditTableProps {
  caixas: Caixa[];
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
                  caixas.map((caixa) => {
                    const saldoInformado =
                      (Number(caixa.valorInformadoDinheiro) || 0) +
                      (Number(caixa.valorInformadoPix) || 0) +
                      (Number(caixa.valorInformadoCartao) || 0) +
                      (Number(caixa.valorInformadoMaquininha) || 0);

                    return (
                      <TableRow key={caixa.id}>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <div className="flex flex-col">
                              <span className="text-[10px] uppercase text-muted-foreground font-semibold">
                                Abertura
                              </span>
                              <span className="text-xs">
                                {format(
                                  new Date(caixa.dataAbertura),
                                  "dd/MM/yyyy 'às' HH:mm",
                                  { locale: ptBR }
                                )}
                              </span>
                            </div>
                            {caixa.dataFechamento ? (
                              <div className="flex flex-col">
                                <span className="text-[10px] uppercase text-muted-foreground font-semibold">
                                  Fechamento
                                </span>
                                <span className="text-xs">
                                  {format(
                                    new Date(caixa.dataFechamento),
                                    "dd/MM/yyyy 'às' HH:mm",
                                    { locale: ptBR }
                                  )}
                                </span>
                              </div>
                            ) : (
                              <Badge className="bg-blue-600 hover:bg-blue-700 text-white w-fit mt-1">
                                Em Aberto
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {formatCurrency(caixa.saldoInicial)}
                        </TableCell>
                        <TableCell>
                          {getQuebraBadge(caixa.quebraDeCaixa ?? null)}
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
                                    Detalhes da movimentação e conferência.
                                  </SheetDescription>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                  <div className="p-3 bg-muted/50 rounded-lg border">
                                    <span className="text-xs text-muted-foreground block mb-1">
                                      Abertura
                                    </span>
                                    <span className="font-medium text-sm block">
                                      {format(
                                        new Date(caixa.dataAbertura),
                                        "dd/MM/yyyy HH:mm",
                                        { locale: ptBR }
                                      )}
                                    </span>
                                  </div>
                                  {caixa.dataFechamento && (
                                    <div className="p-3 bg-muted/50 rounded-lg border">
                                      <span className="text-xs text-muted-foreground block mb-1">
                                        Fechamento
                                      </span>
                                      <span className="font-medium text-sm block">
                                        {format(
                                          new Date(caixa.dataFechamento),
                                          "dd/MM/yyyy HH:mm",
                                          { locale: ptBR }
                                        )}
                                      </span>
                                    </div>
                                  )}
                                </div>

                                <div className="p-4 bg-muted/50 rounded-lg border">
                                  <div className="flex justify-between items-center">
                                    <span className="font-medium text-muted-foreground">
                                      Saldo Inicial (Fundo de Troco)
                                    </span>
                                    <span className="font-semibold text-lg">
                                      {formatCurrency(caixa.saldoInicial)}
                                    </span>
                                  </div>
                                </div>
                              </SheetHeader>

                              <div className="flex-1 overflow-y-auto min-h-0 space-y-6 pr-2">
                                <div>
                                  <h3 className="font-semibold text-sm flex items-center gap-2 mb-3">
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
                                            .filter((m) => m.tipo !== "ABERTURA")
                                            .map((mov) => (
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

                                        {(!caixa.movimentacoes || caixa.movimentacoes.filter((m) => m.tipo !== "ABERTURA").length === 0) && (
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

                                {caixa.status === "FECHADO" && (
                                  <div>
                                    <h3 className="font-semibold text-sm mb-3">Conferência de Fechamento</h3>
                                    <div className="space-y-3 border rounded-lg p-4">
                                      <div className="flex justify-between items-center text-sm">
                                        <span className="text-muted-foreground">Dinheiro em Gaveta</span>
                                        <span className="font-medium">
                                          {formatCurrency(caixa.valorInformadoDinheiro || 0)}
                                        </span>
                                      </div>
                                      <div className="flex justify-between items-center text-sm">
                                        <span className="text-muted-foreground">Maquininha (Cartão/Pix)</span>
                                        <span className="font-medium">
                                          {formatCurrency(
                                            (Number(caixa.valorInformadoMaquininha) || 0) +
                                            (Number(caixa.valorInformadoPix) || 0) +
                                            (Number(caixa.valorInformadoCartao) || 0)
                                          )}
                                        </span>
                                      </div>
                                      <div className="flex justify-between items-center pt-3 border-t">
                                        <span className="font-semibold">Total Informado</span>
                                        <span className="font-bold text-lg">
                                          {formatCurrency(saldoInformado)}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {caixa.justificativa && (
                                  <div>
                                    <h3 className="font-semibold text-sm mb-2">Justificativa de Quebra</h3>
                                    <div className="p-3 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-900/30 rounded-md text-sm text-yellow-800 dark:text-yellow-200">
                                      {caixa.justificativa}
                                    </div>
                                  </div>
                                )}
                              </div>

                              <div className="mt-auto pt-6 border-t space-y-3 bg-background">
                                <div className="flex justify-between items-center">
                                  <span className="font-semibold">Resultado (Quebra de Caixa)</span>
                                  <div className="scale-110 origin-right">
                                    {getQuebraBadge(caixa.quebraDeCaixa ?? null)}
                                  </div>
                                </div>
                                <p className="text-xs text-muted-foreground text-right">
                                  * Diferença entre o valor esperado pelo sistema e o valor informado.
                                </p>
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
