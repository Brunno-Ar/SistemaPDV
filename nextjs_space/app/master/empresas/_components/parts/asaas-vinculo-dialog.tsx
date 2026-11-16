"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { AlertTriangle, CreditCard } from "lucide-react";
import {
  montarPreviewAsaas,
  confirmarPreviewAsaas,
} from "./asaas-vinculo-service";
import type { AsaasPreviewPayload } from "./asaas-vinculo-types";

interface AsaasVinculoDialogProps {
  empresaId: string;
  empresaNome: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAtualizar?: () => void;
}

export function AsaasVinculoDialog({
  empresaId,
  empresaNome,
  open,
  onOpenChange,
  onAtualizar,
}: AsaasVinculoDialogProps) {
  const [preview, setPreview] = useState<AsaasPreviewPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [resultado, setResultado] = useState<
    | { tipo: "sucesso"; mensagem: string }
    | { tipo: "erro"; mensagem: string }
    | null
  >(null);
  // Checkboxes controlados: nunca marcam sozinhos; exigem aceite explícito.
  const [termosAceito, setTermosAceito] = useState(false);
  const [terminalAceito, setTerminalAceito] = useState(false);

  const carregarPreview = useCallback(async () => {
    setError(null);
    setResultado(null);
    setTermosAceito(false);
    setTerminalAceito(false);
    try {
      const p = await montarPreviewAsaas(empresaId);
      setPreview(p);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Não foi possível carregar a prévia.",
      );
    }
  }, [empresaId]);

  // Carrega a prévia só quando o modal é aberto e reseta ao fechar.
  useEffect(() => {
    if (open) {
      carregarPreview();
    } else {
      setPreview(null);
      setError(null);
      setResultado(null);
      setTermosAceito(false);
      setTerminalAceito(false);
    }
  }, [open, empresaId, carregarPreview]);

  const handleConfirmar = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!preview || !preview.token) return;
    setConfirmando(true);
    try {
      const corpo: {
        empresaId: string;
        token: string;
        confirmarTerminal?: boolean;
        confirmarTermos?: boolean;
      } = { empresaId, token: preview.token };
      const p = preview;
      if (p.proposta.requerConfirmacaoTerminal) {
        corpo.confirmarTerminal = terminalAceito;
      }
      if (p.proposta.requerConfirmacaoTermos) {
        corpo.confirmarTermos = termosAceito;
      }
      const r = await confirmarPreviewAsaas(corpo);
      if (r.ok) {
        setResultado({
          tipo: "sucesso",
          mensagem:
            r.aplicado
              ? `Sincronizado com sucesso. Status: ${r.statusFinal ?? "mantido"}.`
              : "Nenhuma alteração aplicada (já está atualizado).",
        });
        onAtualizar?.();
      } else {
        setResultado({
          tipo: "erro",
          mensagem: r.erro || "Não foi possível confirmar a ação.",
        });
      }
    } catch (err) {
      setResultado({
        tipo: "erro",
        mensagem: err instanceof Error ? err.message : "Erro ao confirmar.",
      });
    } finally {
      setConfirmando(false);
    }
  };

  if (!open) return null;

  // Estado ainda carregando: exibe esqueleto leve
  if (!preview && !error) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Prévia do Asaas - {empresaNome}</DialogTitle>
          </DialogHeader>
          <p>Carregando prévia...</p>
        </DialogContent>
      </Dialog>
    );
  }

  if (error) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Prévia do Asaas - {empresaNome}</DialogTitle>
          </DialogHeader>
          <Alert variant="destructive">
            <AlertTitle>Erro ao carregar prévia</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </DialogContent>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Fechar</Button>
        </DialogFooter>
      </Dialog>
    );
  }

  if (!preview) return null;

  const p = preview;
  const modo = p.modo;
  const proposta = p.proposta;
  const asaas = p.asaas;
  const pagamento = asaas.pagamento;

  const modoLabel = {
    vinculada: "Empresa já vinculada ao Asaas",
    provisionamento: "Provisionar no Asaas",
    conflito: "Conflito no Asaas",
  }[modo];

  const acaoLabel = {
    sincronizar: "Sincronizar status/vencimento",
    vincular_assinatura: "Vincular assinatura existente",
    criar_assinatura: "Criar assinatura no Asaas",
  }[proposta.acao];

  const precisaTermos = proposta.requerConfirmacaoTermos;
  const precisaTerminal = proposta.requerConfirmacaoTerminal;

  const podeConfirmar =
    !resultado &&
    !confirmando &&
    preview !== null &&
    modo !== "conflito" &&
    (!precisaTermos || termosAceito) &&
    (!precisaTerminal || terminalAceito);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg sm:max-w-xl p-6">
        <DialogHeader>
          <DialogTitle>{modoLabel}</DialogTitle>
          <DialogDescription>{empresaNome}</DialogDescription>
        </DialogHeader>

        {resultado && (
          <div className="mb-4 rounded-lg border p-4 text-sm">
            {resultado.tipo === "sucesso" ? (
              <Alert>
                <AlertTitle>Confirmado</AlertTitle>
                <AlertDescription>{resultado.mensagem}</AlertDescription>
              </Alert>
            ) : (
              <Alert variant="destructive">
                <AlertTitle>Não confirmado</AlertTitle>
                <AlertDescription>{resultado.mensagem}</AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {!resultado && (
          <>
            <div className="mb-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Situação</span>
                <span className="font-medium">
                  {modo === "vinculada" ? "Vinculado" : "Não vinculado"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Modo</span>
                <span className="font-medium capitalize">{modo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Ação proposta</span>
                <span className="font-medium">{acaoLabel}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Status atual</span>
                <span className="font-medium">{proposta.statusAtual}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Status proposto</span>
                <span className="font-medium">{proposta.statusProposto}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Vencimento atual</span>
                <span className="font-medium">
                  {proposta.vencimentoAtual || "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Vencimento proposto</span>
                <span className="font-medium">
                  {proposta.vencimentoProposto || "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Fonte da prova</span>
                <span className="font-medium">{pagamento.fonte}</span>
              </div>
            </div>

            {asaas.customer.id && (
              <div className="mb-4 rounded-lg border bg-gray-50 dark:bg-zinc-800/50 p-3 text-xs text-gray-600 dark:text-gray-300">
                <p className="font-semibold mb-1">Asaas</p>
                <p>Customer: {asaas.customer.id} ({asaas.customer.situacao})</p>
                <p>
                  Assinatura:{asaas.assinatura.id || "—"} ({asaas.assinatura.situacao})
                </p>
                <p>
                  Status: {asaas.assinatura.status || "—"} • Ciclo:
                  {asaas.assinatura.ciclo || "—"} • Valor:
                  {asaas.assinatura.valor != null
                    ? String(asaas.assinatura.valor)
                    : "—"}
                </p>
              </div>
            )}

            {proposta.acao === "criar_assinatura" && p.provisionamento && (
              <div className="mb-4 rounded-lg border bg-amber-50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-800/30 p-4">
                <div className="flex items-start gap-2 mb-2">
                  <CreditCard className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <span className="font-semibold text-amber-800 dark:text-amber-300 text-sm">
                    Isso gera uma cobrança real no Asaas
                  </span>
                </div>
                <ul className="list-disc list-inside text-sm text-amber-700 dark:text-amber-200 space-y-1">
                  <li>
                    Criar customer:{p.provisionamento.criarCustomer ? " sim" : " não"}
                  </li>
                  <li>
                    Criar assinatura:{p.provisionamento.criarAssinatura ? " sim" : " não"}
                  </li>
                  <li>
                    Valor: <span>{String(p.provisionamento.valor)}</span>
                  </li>
                  <li>
                    Ciclo: <span>{p.provisionamento.ciclo}</span>
                  </li>
                  <li>
                    Tipo: <span>{p.provisionamento.billingType}</span>
                  </li>
                  <li>
                    Primeiro vencimento:{" "}
                    <span>{p.provisionamento.primeiroVencimento}</span>
                  </li>
                </ul>
                <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                  O acesso pago permanece condicionado a{" "}
                  <span className="font-semibold">PAYMENT_RECEIVED</span>; esta
                  ação sozinha não libera acesso.
                </p>
                {precisaTermos && (
                  <div className="mt-3 flex items-center">
                    <Checkbox
                      id="termos-checkbox"
                      aria-label="Li e concordo com os termos acima (criação de cobrança)"
                      checked={termosAceito}
                      onCheckedChange={(c) => setTermosAceito(c === true)}
                    />
                    <label htmlFor="termos-checkbox" className="ml-2 text-sm cursor-pointer select-none">
                      Li e concordo com os termos acima (criação de cobrança)
                    </label>
                  </div>
                )}
              </div>
            )}

            {precisaTerminal && proposta.statusAsaasTerminal && (
              <div className="mb-4 rounded-lg border border-orange-200 bg-orange-50 dark:bg-orange-900/10 dark:border-orange-800/30 p-4">
                <AlertTitle className="text-sm font-semibold text-orange-800 dark:text-orange-300 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> Assinatura cancelada no Asaas
                </AlertTitle>
                <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                  O cancelamento terminal exige confirmação explícita.
                </p>
                <div className="mt-3 flex items-center">
                  <Checkbox
                    id="terminal-checkbox"
                    aria-label="Confirmo que desejo aplicar o cancelamento terminal"
                    checked={terminalAceito}
                    onCheckedChange={(c) => setTerminalAceito(c === true)}
                  />
                  <label htmlFor="terminal-checkbox" className="ml-2 text-sm cursor-pointer select-none">
                    Confirmo que desejo aplicar o cancelamento terminal
                  </label>
                </div>
              </div>
            )}

            {p.avisos.length > 0 && (
              <div className="mb-4 rounded-lg border border-yellow-200 bg-yellow-50 dark:bg-yellow-900/10 dark:border-yellow-800/30 p-3">
                <AlertTitle className="text-sm font-semibold text-yellow-800 dark:text-yellow-300 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> Avisos
                </AlertTitle>
                <ul className="list-disc list-inside text-xs text-yellow-700 dark:text-yellow-200 mt-1 space-y-0.5">
                  {p.avisos.map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
              </div>
            )}

            {modo === "conflito" && p.conflito && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-800/30 p-4">
                <AlertTitle className="text-sm font-semibold text-red-800 dark:text-red-300 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> Conflito — não resolver automaticamente
                </AlertTitle>
                <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                  {p.conflito.motivo}
                </p>
                {p.conflito.candidatos.length > 0 && (
                  <ul className="list-disc list-inside text-xs text-red-600 dark:text-red-400 mt-1 space-y-0.5">
                    {p.conflito.candidatos.map((c) => (
                      <li key={c.id}>
                        Assinatura {c.id}: {c.status} • {c.ciclo} • {c.valor}
                      </li>
                    ))}
                  </ul>
                )}
                <p className="text-xs text-red-600 dark:text-red-400 mt-2">
                  Escolha uma assinatura existente ou corrija o cadastro antes
                  de prosseguir.
                </p>
              </div>
            )}

            {!proposta.liberaAcesso && modo !== "conflito" && (
              <p className="text-xs text-gray-500 mt-2">
                Acesso pago permanece condicionado a PAYMENT_RECEIVED; esta ação
                por si só não libera acesso.
              </p>
            )}
          </>
        )}

        <DialogFooter>
          {resultado ? (
            <Button onClick={() => onOpenChange(false)}>Fechar</Button>
          ) : modo === "conflito" ? (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={confirmando}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleConfirmar}
                disabled={!podeConfirmar || confirmando}
                className="bg-blue-600 text-white hover:bg-blue-700 border-blue-600"
              >
                {confirmando ? "Confirmando..." : "Confirmar ação"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

//