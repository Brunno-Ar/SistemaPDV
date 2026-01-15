"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { formatCurrency, parseCurrency } from "@/lib/utils";
import { AlertTriangle, CheckCircle2, Lock } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

interface DetalhesConferencia {
  esperado: {
    dinheiro: number;
    maquininha: number;
    total: number;
  };
  informado: {
    dinheiro: number;
    maquininha: number;
    total: number;
  };
  diferenca: {
    dinheiro: number;
    maquininha: number;
    total: number;
  };
}

interface FechamentoCaixaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  saldoInicial: number;
}

export function FechamentoCaixaDialog({
  open,
  onOpenChange,
  onSuccess,
  saldoInicial,
}: FechamentoCaixaDialogProps) {
  const [processing, setProcessing] = useState(false);

  // Inputs Fechamento
  const [valorDinheiro, setValorDinheiro] = useState("");
  const [valorMaquininha, setValorMaquininha] = useState("");
  const [justificativa, setJustificativa] = useState("");

  // Auth Gerente (Divergência)
  const [managerEmail, setManagerEmail] = useState("");
  const [managerPassword, setManagerPassword] = useState("");
  const [isAuthorized, setIsAuthorized] = useState(false); // Controls visibility of blind audit values

  // Estado Conferência
  const [etapaFechamento, setEtapaFechamento] = useState<
    "contagem" | "resultado"
  >("contagem");
  const [resultadoConferencia, setResultadoConferencia] =
    useState<DetalhesConferencia | null>(null);
  const [temDivergencia, setTemDivergencia] = useState(false);

  const resetFechamento = () => {
    setValorDinheiro("");
    setValorMaquininha("");
    setJustificativa("");
    setManagerEmail("");
    setManagerPassword("");
    setIsAuthorized(false);
    setEtapaFechamento("contagem");
    setResultadoConferencia(null);
    setTemDivergencia(false);
  };

  // Função para validar e permitir apenas números e separadores decimais
  const sanitizeValue = (value: string) => value.replace(/[^0-9.,]/g, "");

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetFechamento();
    }
    onOpenChange(newOpen);
  };

  const verifyManager = async () => {
    if (!managerEmail || !managerPassword) {
      toast({
        title: "Erro",
        description: "Informe e-mail e senha do gerente.",
        variant: "destructive",
      });
      return;
    }

    setProcessing(true);
    try {
      const res = await fetch("/api/caixa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "verify_manager",
          managerEmail,
          managerPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Falha na validação");

      setIsAuthorized(true);
      toast({
        title: "Autorizado",
        description: "Valores revelados com sucesso.",
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Acesso Negado",
        description: error instanceof Error ? error.message : "Erro na validação",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleAction = async (action: "conferir" | "fechar") => {
    setProcessing(true);
    try {
      const payload: Record<string, string | number> = { action };

      payload.valorInformadoDinheiro = parseCurrency(valorDinheiro);
      // New field: Maquininha (Pix + Card)
      payload.valorInformadoMaquininha = parseCurrency(valorMaquininha);

      if (action === "fechar") {
        payload.justificativa = justificativa;

        // Client-side validation for divergence
        if (temDivergencia) {
          if (!justificativa.trim()) {
            toast({
              title: "Erro",
              description: "Justificativa é obrigatória quando há divergência.",
              variant: "destructive",
            });
            setProcessing(false);
            return;
          }

          // Manager Auth required
          if (!isAuthorized) {
            toast({
              title: "Bloqueio de Segurança",
              description:
                "É necessário validar as credenciais do gerente para prosseguir.",
              variant: "destructive",
            });
            setProcessing(false);
            return;
          }

          // We send credentials again to ensure atomic verification on backend close action
          payload.managerEmail = managerEmail;
          payload.managerPassword = managerPassword;
        }
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
        return;
      }

      // Action === fechar
      toast({
        title: data.divergencia ? "Fechado com Divergência" : "Sucesso",
        description: data.message,
        variant: data.divergencia ? "destructive" : "default",
      });

      onSuccess();
      handleOpenChange(false);
    } catch (error) {
      toast({
        title: "Erro",
        description:
          error instanceof Error ? error.message : "Erro na operação",
        variant: "destructive",
      });
    } finally {
      if (action !== "conferir") {
        setProcessing(false);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Fechamento de Caixa</DialogTitle>
          <DialogDescription>
            {etapaFechamento === "contagem"
              ? "Informe os valores apurados para cada forma de pagamento."
              : "Confira o resultado do fechamento."}
          </DialogDescription>
        </DialogHeader>

        {etapaFechamento === "contagem" && (
          <div className="py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="valorDinheiro">Dinheiro na Gaveta</Label>
                <Input
                  id="valorDinheiro"
                  type="text"
                  value={valorDinheiro}
                  onChange={(e) =>
                    setValorDinheiro(sanitizeValue(e.target.value))
                  }
                  placeholder="0.00"
                  inputMode="decimal"
                />
                <p className="text-[10px] text-muted-foreground">
                  (Conte o dinheiro físico)
                </p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="valorMaquininha">Total Maquininha</Label>
                <Input
                  id="valorMaquininha"
                  type="text"
                  value={valorMaquininha}
                  onChange={(e) =>
                    setValorMaquininha(sanitizeValue(e.target.value))
                  }
                  placeholder="0.00"
                  inputMode="decimal"
                />
                <p className="text-[10px] text-muted-foreground">
                  (Somatória de Pix e Cartão na máquina)
                </p>
              </div>
            </div>
          </div>
        )}

        {etapaFechamento === "resultado" && resultadoConferencia && (
          <div className="py-4 space-y-4">
            {temDivergencia ? (
              <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-md border border-red-200 dark:border-red-900 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-red-700 dark:text-red-400">
                    Divergência Encontrada
                  </h4>
                  <p className="text-sm text-red-600/90 dark:text-red-400/90">
                    Os valores informados não batem com o sistema. Verifique os
                    detalhes abaixo.
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-md border border-green-200 dark:border-green-900 flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-green-700 dark:text-green-400">
                    Valores Corretos!
                  </h4>
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
                  <TableHead className="text-right">Esperado</TableHead>
                  <TableHead className="text-right">Diferença</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[
                  {
                    label: "Dinheiro",
                    inf: resultadoConferencia.informado.dinheiro,
                    sys: resultadoConferencia.esperado.dinheiro,
                    diff: resultadoConferencia.diferenca.dinheiro,
                  },
                  {
                    label: "Maquininha",
                    inf: resultadoConferencia.informado.maquininha,
                    sys: resultadoConferencia.esperado.maquininha,
                    diff: resultadoConferencia.diferenca.maquininha,
                  },
                  {
                    label: "TOTAL GERAL",
                    inf: resultadoConferencia.informado.total,
                    sys: resultadoConferencia.esperado.total,
                    diff: resultadoConferencia.diferenca.total,
                    bold: true,
                  },
                ].map((row) => (
                  <TableRow
                    key={row.label}
                    className={row.bold ? "bg-muted/50 font-bold" : ""}
                  >
                    <TableCell className="font-medium">{row.label}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(row.inf)}
                    </TableCell>
                    <TableCell className="text-right">
                      {!temDivergencia || isAuthorized
                        ? formatCurrency(row.sys)
                        : "*****"}
                    </TableCell>
                    <TableCell
                      className={`text-right font-bold ${
                        !temDivergencia || isAuthorized
                          ? Math.abs(row.diff) > 0.009
                            ? row.diff > 0
                              ? "text-blue-600"
                              : "text-red-600"
                            : "text-green-600"
                          : "text-gray-500"
                      }`}
                    >
                      {!temDivergencia || isAuthorized
                        ? formatCurrency(row.diff)
                        : "*****"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Exibição do Faturamento Real - Blind Audit: Visible only if Authorized */}
            {(!temDivergencia || isAuthorized) && (
              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md border border-blue-100 dark:border-blue-900 flex justify-between items-center">
                <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  💰 Valor Faturado (Vendas Líquidas):
                </span>
                <span className="text-lg font-bold text-blue-700 dark:text-blue-300">
                  {formatCurrency(
                    resultadoConferencia.informado.total - saldoInicial
                  )}
                </span>
              </div>
            )}

            <div className="grid gap-2">
              <Label className={temDivergencia ? "text-red-600 font-bold" : ""}>
                Justificativa {temDivergencia && "(Obrigatório)"}
              </Label>
              <Textarea
                placeholder={
                  temDivergencia
                    ? "Explique a diferença encontrada..."
                    : "Observações opcionais..."
                }
                value={justificativa}
                onChange={(e) => setJustificativa(e.target.value)}
                className={
                  temDivergencia && !justificativa
                    ? "border-red-500 focus-visible:ring-red-500"
                    : ""
                }
              />
            </div>

            {/* Autenticação de Gerente (Apenas se houver divergência) */}
            {temDivergencia && (
              <div className="space-y-4 pt-2 border-t mt-2">
                <div className="flex items-center gap-2 text-red-600 font-semibold">
                  <Lock className="h-4 w-4" />
                  <h4>Autorização de Gerente Necessária</h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>E-mail do Gerente</Label>
                    <Input
                      type="email"
                      placeholder="admin@exemplo.com"
                      value={managerEmail}
                      onChange={(e) => setManagerEmail(e.target.value)}
                      autoComplete="username"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Senha do Gerente</Label>
                    <div className="flex gap-2">
                      <Input
                        type="password"
                        placeholder="••••••••"
                        value={managerPassword}
                        onChange={(e) => setManagerPassword(e.target.value)}
                        autoComplete="current-password"
                      />
                      {!isAuthorized && (
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={verifyManager}
                          disabled={
                            processing || !managerEmail || !managerPassword
                          }
                        >
                          Validar
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {etapaFechamento === "contagem" ? (
            <>
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Cancelar
              </Button>
              <Button
                onClick={() => handleAction("conferir")}
                disabled={processing}
                className="bg-[#0f172a] hover:bg-[#1e293b] text-white"
              >
                {processing ? "Conferindo..." : "Conferir Valores"}
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => setEtapaFechamento("contagem")}
              >
                Voltar
              </Button>
              <Button
                variant={temDivergencia ? "destructive" : "default"}
                onClick={() => handleAction("fechar")}
                disabled={
                  processing ||
                  (temDivergencia &&
                    (!justificativa.trim() || !isAuthorized))
                }
                className={
                  !temDivergencia
                    ? "bg-[#0f172a] hover:bg-[#1e293b] text-white"
                    : ""
                }
              >
                {processing
                  ? "Finalizando..."
                  : temDivergencia
                  ? "Finalizar Fechamento"
                  : "Finalizar Fechamento"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
