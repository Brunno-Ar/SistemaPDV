"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
import {
  Lock,
  Unlock,
  ArrowUpCircle,
  ArrowDownCircle,
  RotateCcw,
  History,
  AlertTriangle,
  CheckCircle2
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Textarea } from "@/components/ui/textarea";

interface Movimentacao {
  id: string;
  tipo: "SANGRIA" | "SUPRIMENTO" | "ABERTURA";
  valor: number;
  descricao: string;
  dataHora: string;
}

interface CaixaStatus {
  id: string;
  status: "ABERTO" | "FECHADO";
  saldoInicial: number;
  dataAbertura: string;
  movimentacoes: Movimentacao[];
}

interface DetalhesConferencia {
  esperado: {
    dinheiro: number;
    pix: number;
    cartao: number;
  };
  informado: {
    dinheiro: number;
    pix: number;
    cartao: number;
  };
  diferenca: {
    dinheiro: number;
    pix: number;
    cartao: number;
    total: number;
  };
}

export function MeuCaixa() {
  const [caixa, setCaixa] = useState<CaixaStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState<string | null>(null);

  // Inputs Gerais
  const [inputValue, setInputValue] = useState("");
  const [description, setDescription] = useState("");
  const [processing, setProcessing] = useState(false);

  // Inputs Fechamento
  const [valorDinheiro, setValorDinheiro] = useState("");
  const [valorPix, setValorPix] = useState("");
  const [valorCartao, setValorCartao] = useState("");
  const [justificativa, setJustificativa] = useState("");

  // Estado Conferência
  const [etapaFechamento, setEtapaFechamento] = useState<"contagem" | "resultado">("contagem");
  const [resultadoConferencia, setResultadoConferencia] = useState<DetalhesConferencia | null>(null);
  const [temDivergencia, setTemDivergencia] = useState(false);

  const router = useRouter();

  const fetchStatus = async () => {
    try {
      const res = await fetch("/api/caixa");
      if (res.ok) {
        const data = await res.json();
        setCaixa(data.caixaAberto || null);
      }
    } catch (error) {
      console.error("Erro ao buscar status do caixa", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const resetFechamento = () => {
    setValorDinheiro("");
    setValorPix("");
    setValorCartao("");
    setJustificativa("");
    setEtapaFechamento("contagem");
    setResultadoConferencia(null);
    setTemDivergencia(false);
  };

  const handleAction = async (action: string) => {
    setProcessing(true);
    try {
      const payload: any = { action };

      if (action === "abrir") {
        const cleanValue = inputValue.replace(',', '.');
        const numericValue = parseFloat(cleanValue);
        if (isNaN(numericValue)) throw new Error("Valor inválido.");
        payload.saldoInicial = numericValue;
      }
      else if (action === "sangria" || action === "suprimento") {
        const cleanValue = inputValue.replace(',', '.');
        const numericValue = parseFloat(cleanValue);
        if (isNaN(numericValue)) throw new Error("Valor inválido.");
        payload.valor = numericValue;
        payload.descricao = description;
      }
      else if (action === "conferir") {
        payload.valorInformadoDinheiro = parseFloat(valorDinheiro.replace(',', '.') || "0");
        payload.valorInformadoPix = parseFloat(valorPix.replace(',', '.') || "0");
        payload.valorInformadoCartao = parseFloat(valorCartao.replace(',', '.') || "0");
      }
      else if (action === "fechar") {
        payload.valorInformadoDinheiro = parseFloat(valorDinheiro.replace(',', '.') || "0");
        payload.valorInformadoPix = parseFloat(valorPix.replace(',', '.') || "0");
        payload.valorInformadoCartao = parseFloat(valorCartao.replace(',', '.') || "0");
        payload.justificativa = justificativa;
      }

      const res = await fetch("/api/caixa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Erro na operação");
      }

      if (action === "conferir") {
        setResultadoConferencia(data.detalhes);
        setTemDivergencia(data.temDivergencia);
        setEtapaFechamento("resultado");
        setProcessing(false);
        return; // Não fecha o modal, apenas muda de etapa
      }

      toast({
        title: action === "fechar" && data.divergencia ? "Fechado com Divergência" : "Sucesso",
        description: data.message,
        variant: action === "fechar" && data.divergencia ? "destructive" : "default",
      });

      setDialogOpen(null);
      setInputValue("");
      setDescription("");
      resetFechamento();
      fetchStatus();

    } catch (error: any) {
      if (error.message && error.message.includes("já possui um caixa aberto")) {
        toast({
          title: "Atenção",
          description: "Detectamos que seu caixa já está aberto. Atualizando...",
          variant: "default",
        });
        setDialogOpen(null);
        fetchStatus();
        return;
      }

      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      if (action !== "conferir") {
        setProcessing(false);
      }
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  if (loading) return null;

  // Renderização: Caixa Fechado
  if (!caixa) {
    return (
      <Card className="border-l-4 border-l-red-500 bg-red-50 dark:bg-red-900/10 mb-6">
        <CardContent className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-red-100 dark:bg-red-900/40 p-3 rounded-full">
              <Lock className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-red-700 dark:text-red-300">
                Caixa Fechado
              </h3>
              <p className="text-sm text-red-600/80 dark:text-red-400/80">
                Abra o caixa para iniciar as vendas do dia.
              </p>
            </div>
          </div>

          <Dialog open={dialogOpen === "abrir"} onOpenChange={(o) => setDialogOpen(o ? "abrir" : null)}>
            <DialogTrigger asChild>
              <Button size="lg" className="bg-red-600 hover:bg-red-700 text-white w-full sm:w-auto">
                Abrir Caixa
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Abrir Caixa</DialogTitle>
                <DialogDescription>
                  Informe o fundo de troco (saldo inicial) da gaveta.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="saldoInicial">Saldo Inicial (R$)</Label>
                  <Input
                    id="saldoInicial"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(null)}>Cancelar</Button>
                <Button onClick={() => handleAction("abrir")} disabled={processing || !inputValue}>
                  {processing ? "Abrindo..." : "Confirmar Abertura"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    );
  }

  // Renderização: Caixa Aberto
  return (
    <Card className="border-l-4 border-l-green-500 bg-green-50 dark:bg-green-900/10 mb-6">
      <CardContent className="pt-6 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4 flex-1">
          <div className="bg-green-100 dark:bg-green-900/40 p-3 rounded-full">
            <Unlock className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-green-700 dark:text-green-300">
                Caixa Aberto
              </h3>
              <Badge variant="outline" className="text-green-700 border-green-200 bg-green-100">
                ID: {caixa.id.slice(-4)}
              </Badge>
            </div>
            <p className="text-sm text-green-600/80 dark:text-green-400/80">
              Aberto às {new Date(caixa.dataAbertura).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 w-full md:w-auto justify-end">
          {/* SUPRIMENTO */}
          <Dialog open={dialogOpen === "suprimento"} onOpenChange={(o) => {
            setDialogOpen(o ? "suprimento" : null);
            setInputValue("");
            setDescription("");
          }}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-green-200 hover:bg-green-100 hover:text-green-700 dark:border-green-800 dark:hover:bg-green-900/50">
                <ArrowUpCircle className="mr-2 h-4 w-4" />
                Suprimento
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Registrar Suprimento</DialogTitle>
                <DialogDescription>
                  Adicionar dinheiro à gaveta (entrada manual).
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>Valor (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Descrição / Motivo</Label>
                  <Input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Ex: Troco trazido do banco"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => handleAction("suprimento")} disabled={processing}>
                  Confirmar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* SANGRIA */}
          <Dialog open={dialogOpen === "sangria"} onOpenChange={(o) => {
            setDialogOpen(o ? "sangria" : null);
            setInputValue("");
            setDescription("");
          }}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-red-200 hover:bg-red-50 hover:text-red-700 dark:border-red-900 dark:hover:bg-red-900/30">
                <ArrowDownCircle className="mr-2 h-4 w-4" />
                Sangria
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Registrar Sangria</DialogTitle>
                <DialogDescription>
                  Retirar dinheiro da gaveta (para depósito ou pagamento).
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>Valor (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Descrição / Motivo</Label>
                  <Input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Ex: Pagamento de fornecedor"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="destructive" onClick={() => handleAction("sangria")} disabled={processing}>
                  Confirmar Retirada
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* FECHAR CAIXA */}
          <Dialog open={dialogOpen === "fechar"} onOpenChange={(o) => {
            setDialogOpen(o ? "fechar" : null);
            resetFechamento();
          }}>
            <DialogTrigger asChild>
              <Button variant="default" className="bg-green-600 hover:bg-green-700 text-white ml-2">
                <RotateCcw className="mr-2 h-4 w-4" />
                Fechar Caixa
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Fechamento de Caixa</DialogTitle>
                <DialogDescription>
                  {etapaFechamento === "contagem"
                    ? "Informe os valores apurados para cada forma de pagamento."
                    : "Confira o resultado do fechamento."}
                </DialogDescription>
              </DialogHeader>

              {etapaFechamento === "contagem" && (
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="grid gap-2">
                      <Label>Dinheiro na Gaveta</Label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={valorDinheiro}
                        onChange={(e) => setValorDinheiro(e.target.value)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Total Pix</Label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={valorPix}
                        onChange={(e) => setValorPix(e.target.value)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Total Cartão</Label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={valorCartao}
                        onChange={(e) => setValorCartao(e.target.value)}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    * Deixe em branco caso não tenha havido vendas no método.
                  </p>
                </div>
              )}

              {etapaFechamento === "resultado" && resultadoConferencia && (
                <div className="py-4 space-y-4">
                  {temDivergencia ? (
                    <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-md border border-red-200 dark:border-red-900 flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-red-700 dark:text-red-400">Divergência Encontrada</h4>
                        <p className="text-sm text-red-600/90 dark:text-red-400/90">
                          Os valores informados não batem com o sistema. Verifique os detalhes abaixo.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-md border border-green-200 dark:border-green-900 flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-green-700 dark:text-green-400">Valores Corretos!</h4>
                        <p className="text-sm text-green-600/90 dark:text-green-400/90">
                          O fechamento bateu exatamente com o sistema.
                        </p>
                      </div>
                    </div>
                  )}

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Método</TableHead>
                        <TableHead className="text-right">Informado</TableHead>
                        <TableHead className="text-right">Sistema</TableHead>
                        <TableHead className="text-right">Diferença</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[
                        { label: "Dinheiro", inf: resultadoConferencia.informado.dinheiro, sys: resultadoConferencia.esperado.dinheiro, diff: resultadoConferencia.diferenca.dinheiro },
                        { label: "Pix", inf: resultadoConferencia.informado.pix, sys: resultadoConferencia.esperado.pix, diff: resultadoConferencia.diferenca.pix },
                        { label: "Cartão", inf: resultadoConferencia.informado.cartao, sys: resultadoConferencia.esperado.cartao, diff: resultadoConferencia.diferenca.cartao },
                      ].map((row) => (
                        <TableRow key={row.label}>
                          <TableCell className="font-medium">{row.label}</TableCell>
                          <TableCell className="text-right">{formatCurrency(row.inf)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(row.sys)}</TableCell>
                          <TableCell className={`text-right font-bold ${
                            Math.abs(row.diff) > 0.009
                              ? row.diff > 0 ? "text-blue-600" : "text-red-600"
                              : "text-green-600"
                          }`}>
                            {formatCurrency(row.diff)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  <div className="grid gap-2">
                    <Label className={temDivergencia ? "text-red-600 font-bold" : ""}>
                      Justificativa {temDivergencia && "(Obrigatório)"}
                    </Label>
                    <Textarea
                      placeholder={temDivergencia ? "Explique a diferença encontrada..." : "Observações opcionais..."}
                      value={justificativa}
                      onChange={(e) => setJustificativa(e.target.value)}
                      className={temDivergencia && !justificativa ? "border-red-500 focus-visible:ring-red-500" : ""}
                    />
                  </div>
                </div>
              )}

              <DialogFooter>
                {etapaFechamento === "contagem" ? (
                  <>
                    <Button variant="outline" onClick={() => setDialogOpen(null)}>Cancelar</Button>
                    <Button onClick={() => handleAction("conferir")} disabled={processing}>
                      {processing ? "Conferindo..." : "Conferir Valores"}
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" onClick={() => setEtapaFechamento("contagem")}>Voltar</Button>
                    <Button
                      variant={temDivergencia ? "destructive" : "default"}
                      onClick={() => handleAction("fechar")}
                      disabled={processing || (temDivergencia && !justificativa.trim())}
                    >
                      {processing ? "Finalizando..." : (temDivergencia ? "Finalizar com Divergência" : "Finalizar Fechamento")}
                    </Button>
                  </>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Movimentações (Accordion for History) */}
        <div className="w-full mt-4 pt-4 border-t dark:border-zinc-800">
          <Accordion type="single" collapsible>
            <AccordionItem value="movimentacoes" className="border-none">
              <AccordionTrigger className="py-2 hover:no-underline">
                <div className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200">
                  <History className="h-4 w-4" />
                  Ver Histórico de Movimentações
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="rounded-md border dark:border-zinc-800 mt-2">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Horário</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {caixa.movimentacoes && caixa.movimentacoes.length > 0 ? (
                        caixa.movimentacoes.map((mov) => (
                          <TableRow key={mov.id}>
                            <TableCell>
                              {new Date(mov.dataHora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  mov.tipo === "SUPRIMENTO" || mov.tipo === "ABERTURA" ? "default" : "destructive"
                                }
                                className={
                                  mov.tipo === "ABERTURA" ? "bg-blue-500 hover:bg-blue-600" : ""
                                }
                              >
                                {mov.tipo}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-gray-500">{mov.descricao || "-"}</TableCell>
                            <TableCell className="text-right font-medium">
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(mov.valor))}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground">
                            Nenhuma movimentação registrada.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </CardContent>
    </Card>
  );
}
