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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  AsaasPreviewError,
} from "./asaas-vinculo-service";
import type {
  AsaasAdminResumo,
  AsaasPreviewPayload,
} from "./asaas-vinculo-types";

interface AsaasVinculoDialogProps {
  empresaId: string;
  empresaNome: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAtualizar?: () => void;
  admins?: AsaasAdminResumo[];
}

export function AsaasVinculoDialog({
  empresaId,
  empresaNome,
  open,
  onOpenChange,
  onAtualizar,
  admins = [],
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
  // Data da primeira cobrança (edição apenas na modalidade provisionamento).
  const [primeiroVencimento, setPrimeiroVencimento] = useState<string | null>(null);
  const [dataCustomizada, setDataCustomizada] = useState<string | null>(null);
  // Contato de faturamento selecionado (opcional; nunca arbitrário).
  const [adminSelecionado, setAdminSelecionado] = useState<string | null>(null);
  // Quando o backend exige seleção de admin (múltiplos admins), exibe a lista.
  const [adminsExigidos, setAdminsExigidos] = useState(false);
  // Admins recebidos do erro 409 multiplos_admins_selecao_obrigatoria.
  const [adminsErro, setAdminsErro] = useState<AsaasAdminResumo[]>([]);

  const carregarPreview = useCallback(
    async (data?: string | null, adminId?: string | null) => {
      setError(null);
      setResultado(null);
      setTermosAceito(false);
      setTerminalAceito(false);
      setAdminsExigidos(false);
      try {
        const p = await montarPreviewAsaas(
          empresaId,
          data ?? undefined,
          adminId ?? undefined,
        );
        setPreview(p);
        setAdminsErro([]);
        setPrimeiroVencimento(
          p.provisionamento?.primeiroVencimento ?? data ?? null,
        );
        if (p.empresa.adminId) {
          setAdminSelecionado(p.empresa.adminId);
        }
      } catch (e) {
        // Erro tipado do backend: preserva motivo estruturado (ex.: 409
        // multiplos_admins_selecao_obrigatoria com lista de admins).
        if (e instanceof AsaasPreviewError) {
          // 409 multiplos_admins_selecao_obrigatoria: exibe a lista para o
          // usuario escolher (nao esconde a ação nem converte em conflito
          // irresolvivel). Sem admins na resposta, informa que a selecao e
          // obrigatoria sem travar a tela.
          if (e.codigo === "multiplos_admins_selecao_obrigatoria") {
            setAdminsExigidos(true);
            setAdminsErro(e.admins ?? []);
            setError(
              e.admins && e.admins.length > 0
                ? null
                : "A empresa tem múltiplos admins. Selecione um contato de faturamento para continuar.",
            );
            return;
          }
          if (e.codigo === "admin_invalido") {
            setAdminSelecionado(null);
            setError("Contato de faturamento inválido. Escolha outro admin.");
            return;
          }
          // Outros erros tipados: exibe a mensagem real do backend (não mascara conflitos).
          setError(e.message);
          return;
        }
        // Erro não tipado (rede, parse): exibe a mensagem real, sem mascarar conflitos.
        const msg = e instanceof Error ? e.message : "Não foi possível carregar a prévia.";
        setError(msg);
      }
    },
    [empresaId],
  );

  const handleAlterarData = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const data = e.target.value || null;
    setDataCustomizada(data);
    setPrimeiroVencimento(data);
    setTermosAceito(false);
    await carregarPreview(data, adminSelecionado);
  };

  const handleAlterarAdmin = async (value: string) => {
    setAdminSelecionado(value || null);
    setTermosAceito(false);
    await carregarPreview(primeiroVencimento, value || null);
  };

  useEffect(() => {
    if (open) {
      carregarPreview(primeiroVencimento, adminSelecionado);
    } else {
      setPreview(null);
      setError(null);
      setResultado(null);
      setTermosAceito(false);
      setTerminalAceito(false);
      setAdminsExigidos(false);
      setDataCustomizada(null);
      setAdminsErro([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, empresaId, carregarPreview]);

  const handleConfirmar = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!preview || !preview.token) return;
    setConfirmando(true);
    try {
      const p = preview;
      const corpo: {
        empresaId: string;
        token: string;
        confirmarTerminal?: boolean;
        confirmarTermos?: boolean;
        primeiroVencimento?: string;
        adminId?: string;
      } = {
        empresaId,
        token: preview.token,
        primeiroVencimento:
          dataCustomizada ??
          p.provisionamento?.primeiroVencimento ??
          primeiroVencimento ??
          undefined,
        adminId: adminSelecionado ?? undefined,
      };
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

  // Carregando: esqueleto leve
  if (!preview && !error && !adminsExigidos) {
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

  // Erro fatal que impede exibição do dialog
  if (error && error !== "Contato de faturamento inválido" && !adminsExigidos) {
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

  const p = preview;
  const modo = p?.modo ?? "provisionamento";
  const proposta = p?.proposta;
  const asaas = p?.asaas;
  const pagamento = asaas?.pagamento;

  const modoLabel = p
    ? {
        vinculada: "Empresa já vinculada ao Asaas",
        provisionamento: "Provisionar no Asaas",
        conflito: "Conflito no Asaas",
      }[modo]
    : "Provisionar no Asaas";

  const acaoLabel = proposta
    ? {
        sincronizar: "Sincronizar status/vencimento",
        vincular_assinatura: "Vincular assinatura existente",
        criar_assinatura: "Criar assinatura no Asaas",
      }[proposta.acao]
    : "";

  const adminsDisponiveis = admins.length > 0
    ? admins
    : p?.empresa?.admins ?? adminsErro;
  const precisaTermos = proposta?.requerConfirmacaoTermos ?? false;
  const precisaTerminal = proposta?.requerConfirmacaoTerminal ?? false;
  const requerAdmin =
    adminsDisponiveis.length > 0 &&
    modo === "provisionamento" &&
    p?.provisionamento?.criarAssinatura === true;

  const podeConfirmar =
    !resultado &&
    !confirmando &&
    preview !== null &&
    modo !== "conflito" &&
    !adminsExigidos &&
    (!requerAdmin || adminSelecionado !== null) &&
    (!precisaTermos || termosAceito) &&
    (!precisaTerminal || terminalAceito);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg sm:max-w-xl p-4 max-h-[85vh] overflow-y-auto">
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

        {error === "Contato de faturamento inválido" && (
          <Alert variant="destructive" className="mb-4">
            <AlertTitle>Contato de faturamento inválido</AlertTitle>
            <AlertDescription>Escolha outro admin para faturamento.</AlertDescription>
          </Alert>
        )}

        {!resultado && (
          <>
            {p && proposta && (
              <div className="mb-3 space-y-1 text-sm">
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
                  <span className="font-medium">{pagamento?.fonte ?? "nenhuma"}</span>
                </div>
              </div>
            )}

            {asaas?.customer?.id && (
              <div className="mb-3 rounded-lg border bg-gray-50 dark:bg-zinc-800/50 p-2 text-xs text-gray-600 dark:text-gray-300">
                <p className="font-semibold mb-1">Asaas</p>
                <p>Customer: {asaas.customer.id} ({asaas.customer.situacao})</p>
                <p>
                  Assinatura: {asaas.assinatura?.id || "—"} ({asaas.assinatura?.situacao ?? "ausente"})
                </p>
                <p>
                  Status: {asaas.assinatura?.status || "—"} • Ciclo:{" "}
                  {asaas.assinatura?.ciclo || "—"} • Valor:{" "}
                  {asaas.assinatura?.valor != null
                    ? String(asaas.assinatura.valor)
                    : "—"}
                </p>
              </div>
            )}

            {/* Admin exigido pelo backend (409 multiplos_admins). */}
            {adminsExigidos && (
              <div className="mb-3 rounded-lg border bg-orange-50 dark:bg-orange-900/10 border-orange-100 dark:border-orange-800/30 p-2 text-sm">
                <p className="font-semibold mb-1">Escolha o contato de faturamento</p>
                <p className="text-xs text-orange-700 dark:text-orange-300 mb-2">
                  A empresa tem múltiplos admins. Selecione um para continuar.
                </p>
                <div className="space-y-1">
                  {adminsDisponiveis.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => {
                        setAdminSelecionado(a.id);
                        setTermosAceito(false);
                        carregarPreview(primeiroVencimento, a.id);
                      }}
                      className={`w-full text-left text-sm border rounded p-2 ${
                        adminSelecionado === a.id
                          ? "bg-blue-100 dark:bg-blue-900/30 border-blue-500 dark:border-blue-400"
                          : "border-transparent hover:bg-gray-100 dark:hover:bg-zinc-800"
                      }`}
                    >
                      <span>{a.nome} — {a.emailMascarado ?? "—"}</span>
                      <span className="sr-only">{a.emailMascarado}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Contato de faturamento selecionado */}
            {adminsDisponiveis.length > 0 && !adminsExigidos && (
              <div className="mb-3 rounded-lg border bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-800/30 p-2 text-sm">
                <p className="font-semibold mb-1">Contato de faturamento</p>
                {adminSelecionado ? (
                  <p>
                    <span>
                      {adminsDisponiveis.find((a) => a.id === adminSelecionado)?.nome ?? "—"}
                      {" — "}
                      {adminsDisponiveis.find((a) => a.id === adminSelecionado)?.emailMascarado ?? "—"}
                    </span>
                    <span className="sr-only">
                      {adminsDisponiveis.find((a) => a.id === adminSelecionado)?.emailMascarado ?? "—"}
                    </span>
                  </p>
                ) : (
                  <p className="text-orange-600 dark:text-orange-400">
                    Nenhum contato selecionado
                  </p>
                )}
              </div>
            )}

            {proposta?.acao === "criar_assinatura" && p?.provisionamento && (
              <div className="mb-3 rounded-lg border bg-amber-50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-800/30 p-3">
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
                    {dataCustomizada ? (
                      <span className="ml-2">
                        {dataCustomizada} (editado)
                      </span>
                    ) : (
                      <span>{p.provisionamento.primeiroVencimento}</span>
                    )}
                  </li>
                </ul>

                {adminsDisponiveis.length > 0 && (
                  <div className="mt-3">
                    <label className="text-xs text-gray-600 dark:text-gray-300 block mb-1">
                      Contato de faturamento
                    </label>
                    <Select
                      value={adminSelecionado ?? ""}
                      onValueChange={handleAlterarAdmin}
                    >
                      <SelectTrigger className="w-64" aria-label="contato de faturamento">
                        <SelectValue placeholder="Escolha o contato" />
                      </SelectTrigger>
                      <SelectContent>
                        {adminsDisponiveis.map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.nome}{" — "}{a.emailMascarado}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <label className="flex items-start gap-2 mt-2 cursor-pointer">
                  <span className="text-xs text-gray-600 dark:text-gray-300 shrink-0">
                    Alterar data da primeira cobrança
                  </span>
                  <input
                    aria-label="alterar data da primeira cobrança"
                    type="date"
                    role="textbox"
                    className="ml-2 border border-gray-300 rounded p-1 text-sm focus:border-blue-500 focus:outline-none"
                    value={primeiroVencimento ?? ""}
                    onChange={handleAlterarData}
                    disabled={
                      proposta.acao !== "criar_assinatura" || !p.provisionamento
                    }
                  />
                </label>
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

            {precisaTerminal && proposta?.statusAsaasTerminal && (
              <div className="mb-3 rounded-lg border border-orange-200 bg-orange-50 dark:bg-orange-900/10 dark:border-orange-800/30 p-3">
                <AlertTitle className="text-sm font-semibold text-orange-800 dark:text-orange-300 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3 shrink-0" />
                  <span>Assinatura cancelada no Asaas</span>
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

            {p?.avisos && p.avisos.length > 0 && (
              <div className="mb-3 rounded-lg border border-yellow-200 bg-yellow-50 dark:bg-yellow-900/10 dark:border-yellow-800/30 p-2">
                <AlertTitle className="text-sm font-semibold text-yellow-800 dark:text-yellow-300 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3 shrink-0" />
                  <span>Avisos</span>
                </AlertTitle>
                <ul className="list-disc list-inside text-xs text-yellow-700 dark:text-yellow-200 mt-1 space-y-0.5">
                  {p.avisos.map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
              </div>
            )}

            {modo === "conflito" && p?.conflito && (
              <div className="mb-3 rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-800/30 p-3">
                <AlertTitle className="text-sm font-semibold text-red-800 dark:text-red-300 flex items-center gap-1">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>Conflito — não resolver automaticamente</span>
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

            {proposta && !proposta.liberaAcesso && modo !== "conflito" && (
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
