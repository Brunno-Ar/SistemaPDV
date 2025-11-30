"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
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
  History
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

export function MeuCaixa() {
  const [caixa, setCaixa] = useState<CaixaStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [description, setDescription] = useState("");
  const [processing, setProcessing] = useState(false);
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

  const handleAction = async (action: string) => {
    setProcessing(true);
    try {
      const payload: any = { action };

      if (action === "abrir") {
        payload.saldoInicial = parseFloat(inputValue);
      } else if (action === "fechar") {
        payload.valorInformado = parseFloat(inputValue);
      } else {
        payload.valor = parseFloat(inputValue);
        payload.descricao = description;
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

      toast({
        title: "Sucesso",
        description: data.message,
      });

      setDialogOpen(null);
      setInputValue("");
      setDescription("");
      fetchStatus(); // Atualizar status

      // Se fechou o caixa, talvez redirecionar ou apenas atualizar a UI?
      // Por enquanto apenas atualiza a UI.

    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
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
                <Button onClick={() => handleAction("abrir")} disabled={processing}>
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
          <Dialog open={dialogOpen === "suprimento"} onOpenChange={(o) => setDialogOpen(o ? "suprimento" : null)}>
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
          <Dialog open={dialogOpen === "sangria"} onOpenChange={(o) => setDialogOpen(o ? "sangria" : null)}>
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
          <Dialog open={dialogOpen === "fechar"} onOpenChange={(o) => setDialogOpen(o ? "fechar" : null)}>
            <DialogTrigger asChild>
              <Button variant="default" className="bg-green-600 hover:bg-green-700 text-white ml-2">
                <RotateCcw className="mr-2 h-4 w-4" />
                Fechar Caixa
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Fechamento de Caixa</DialogTitle>
                <DialogDescription>
                  Conte o dinheiro físico na gaveta e informe o valor abaixo.
                  Esta ação é irreversível.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label className="text-lg font-semibold">Valor em Gaveta (Dinheiro)</Label>
                  <Input
                    className="text-2xl h-14"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                  />
                  <p className="text-sm text-muted-foreground">
                    Não inclua comprovantes de cartão ou Pix, apenas cédulas e moedas.
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => handleAction("fechar")} disabled={processing} className="w-full">
                  {processing ? "Fechando..." : "Confirmar Fechamento Cego"}
                </Button>
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
