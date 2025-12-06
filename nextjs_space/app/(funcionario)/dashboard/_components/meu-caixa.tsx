"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { toast } from "@/hooks/use-toast";
import { formatCurrency, parseCurrency } from "@/lib/utils";
import {
  Lock,
  Unlock,
  ArrowUpCircle,
  ArrowDownCircle,
  RotateCcw,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { useSession } from "next-auth/react";

interface Movimentacao {
  id: string;
  tipo: "SANGRIA" | "SUPRIMENTO" | "ABERTURA" | "VENDA";
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

import { FechamentoCaixaDialog } from "./fechamento-caixa-dialog";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CaixaPayload {
  action: string;
  saldoInicial?: number;
  valor?: number;
  descricao?: string;
  metodoPagamento?: string;
}

interface MeuCaixaProps {
  initialData?: CaixaStatus | null;
}

export function MeuCaixa({ initialData }: MeuCaixaProps = {}) {
  const { data: session } = useSession();
  const [caixa, setCaixa] = useState<CaixaStatus | null>(initialData ?? null);
  const [loading, setLoading] = useState(initialData === undefined); // Só carrega se não tiver dados iniciais
  const [dialogOpen, setDialogOpen] = useState<string | null>(null);

  // Inputs Gerais
  const [inputValue, setInputValue] = useState("");
  const [description, setDescription] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("dinheiro");
  const [processing, setProcessing] = useState(false);

  const router = useRouter();

  const fetchStatus = async () => {
    try {
      const res = await fetch("/api/caixa", { cache: "no-store" });
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
    // 🚀 Otimização: Só busca se não tiver dados iniciais
    if (initialData === undefined) {
      fetchStatus();
    }
  }, [initialData]);

  const handleAction = async (action: string) => {
    setProcessing(true);
    try {
      const payload: CaixaPayload = { action };

      if (action === "abrir") {
        if (!session?.user?.empresaId) {
          toast({
            title: "Erro de Permissão",
            description: "Seu usuário não está vinculado a uma empresa.",
            variant: "destructive",
          });
          setProcessing(false);
          return;
        }

        const numericValue = parseCurrency(inputValue);
        // Saldo inicial pode ser 0
        payload.saldoInicial = numericValue;
      } else if (action === "sangria" || action === "suprimento") {
        const numericValue = parseCurrency(inputValue);
        if (numericValue <= 0)
          throw new Error("Valor deve ser maior que zero.");
        payload.valor = numericValue;
        payload.descricao = description;
        payload.metodoPagamento = paymentMethod;
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
        variant: "default",
      });

      setDialogOpen(null);
      setInputValue("");
      setDescription("");
      setPaymentMethod("dinheiro");
      await fetchStatus();
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro desconhecido";
      if (message.includes("já possui um caixa aberto")) {
        toast({
          title: "Atenção",
          description:
            "Detectamos que seu caixa já está aberto. Atualizando...",
          variant: "default",
          duration: 5000,
        });
        setDialogOpen(null);
        fetchStatus();
        return;
      }

      toast({
        title: "Erro",
        description: message,
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

          <Dialog
            open={dialogOpen === "abrir"}
            onOpenChange={(o) => {
              if (!o) {
                setInputValue("");
                setDescription("");
              }
              setDialogOpen(o ? "abrir" : null);
            }}
          >
            <DialogTrigger asChild>
              <Button
                size="lg"
                className="bg-red-600 hover:bg-red-700 text-white w-full sm:w-auto"
              >
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
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="0,00"
                    inputMode="decimal"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={() => handleAction("abrir")}
                  disabled={processing || !inputValue}
                >
                  {processing ? "Abrindo..." : "Abrir Caixa"}
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
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="bg-green-100 dark:bg-green-900/40 p-3 rounded-full">
              <Unlock className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-green-700 dark:text-green-300">
                Caixa Aberto
              </h3>
              <p className="text-sm text-green-600/80 dark:text-green-400/80">
                Aberto em{" "}
                {new Date(caixa.dataAbertura).toLocaleDateString("pt-BR")} às{" "}
                {new Date(caixa.dataAbertura).toLocaleTimeString("pt-BR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white dark:bg-zinc-900 p-4 rounded-lg shadow-sm border dark:border-zinc-800">
            <p className="text-sm text-muted-foreground">Saldo Inicial</p>
            <p className="text-xl font-bold text-green-600 dark:text-green-400">
              {formatCurrency(caixa.saldoInicial)}
            </p>
          </div>
          <div className="bg-white dark:bg-zinc-900 p-4 rounded-lg shadow-sm border dark:border-zinc-800">
            <p className="text-sm text-muted-foreground">Entradas (Vendas)</p>
            <p className="text-xl font-bold text-green-600 dark:text-green-400">
              {formatCurrency(
                caixa.movimentacoes
                  .filter((m) => m.tipo === "VENDA")
                  .reduce((acc, m) => acc + m.valor, 0)
              )}
            </p>
          </div>
          <div className="bg-white dark:bg-zinc-900 p-4 rounded-lg shadow-sm border dark:border-zinc-800">
            <p className="text-sm text-muted-foreground">Saídas (Sangrias)</p>
            <p className="text-xl font-bold text-red-600 dark:text-red-400">
              {formatCurrency(
                caixa.movimentacoes
                  .filter((m) => m.tipo === "SANGRIA")
                  .reduce((acc, m) => acc + m.valor, 0)
              )}
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 mb-6">
          <Dialog
            open={dialogOpen === "suprimento"}
            onOpenChange={(o) => {
              if (!o) {
                setInputValue("");
                setDescription("");
                setPaymentMethod("dinheiro");
              }
              setDialogOpen(o ? "suprimento" : null);
            }}
          >
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full sm:w-auto">
                <ArrowUpCircle className="h-4 w-4 mr-2" />
                Suprimento
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Realizar Suprimento</DialogTitle>
                <DialogDescription>
                  Adicione dinheiro ao caixa.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="valorSuprimento">Valor (R$)</Label>
                  <Input
                    id="valorSuprimento"
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="0,00"
                    inputMode="decimal"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="metodoPagamentoSuprimento">
                    Forma de Pagamento
                  </Label>
                  <Select
                    value={paymentMethod}
                    onValueChange={setPaymentMethod}
                  >
                    <SelectTrigger id="metodoPagamentoSuprimento">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dinheiro">Dinheiro</SelectItem>
                      <SelectItem value="pix">Pix</SelectItem>
                      <SelectItem value="debito">Débito</SelectItem>
                      <SelectItem value="credito">Crédito</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="descricaoSuprimento">Descrição</Label>
                  <Input
                    id="descricaoSuprimento"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Ex: Troco inicial, reforço de caixa"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={() => handleAction("suprimento")}
                  disabled={processing || !inputValue}
                >
                  {processing ? "Adicionando..." : "Confirmar Suprimento"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog
            open={dialogOpen === "sangria"}
            onOpenChange={(o) => {
              if (!o) {
                setInputValue("");
                setDescription("");
                setPaymentMethod("dinheiro");
              }
              setDialogOpen(o ? "sangria" : null);
            }}
          >
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full sm:w-auto">
                <ArrowDownCircle className="h-4 w-4 mr-2" />
                Sangria
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Realizar Sangria</DialogTitle>
                <DialogDescription>Retire dinheiro do caixa.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="valorSangria">Valor (R$)</Label>
                  <Input
                    id="valorSangria"
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="0,00"
                    inputMode="decimal"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="metodoPagamentoSangria">
                    Forma de Pagamento
                  </Label>
                  <Select
                    value={paymentMethod}
                    onValueChange={setPaymentMethod}
                  >
                    <SelectTrigger id="metodoPagamentoSangria">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dinheiro">Dinheiro</SelectItem>
                      <SelectItem value="pix">Pix</SelectItem>
                      <SelectItem value="debito">Débito</SelectItem>
                      <SelectItem value="credito">Crédito</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="descricaoSangria">Descrição</Label>
                  <Input
                    id="descricaoSangria"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Ex: Pagamento de despesa, retirada para banco"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={() => handleAction("sangria")}
                  disabled={processing || !inputValue}
                >
                  {processing ? "Retirando..." : "Confirmar Sangria"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button
            variant="destructive"
            className="w-full sm:w-auto"
            onClick={() => setDialogOpen("fechar")}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Fechar Caixa
          </Button>

          <FechamentoCaixaDialog
            open={dialogOpen === "fechar"}
            onOpenChange={(open) => !open && setDialogOpen(null)}
            onSuccess={async () => {
              setDialogOpen(null);
              await fetchStatus();
              router.refresh();
            }}
          />
        </div>
      </CardContent>
    </Card>
  );
}
