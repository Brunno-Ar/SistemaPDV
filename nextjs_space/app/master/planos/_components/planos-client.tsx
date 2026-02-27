"use client";

import { useEffect, useState } from "react";
import { toast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Loader2, DollarSign, RefreshCw, AlertCircle } from "lucide-react";
import {
  atualizarValorAssinatura,
  getEmpresasComAssinatura,
  getValorAssinatura,
} from "../_actions/planos";

interface EmpresaPlan {
  id: string;
  nome: string;
  asaasSubscriptionId: string;
  cpfCnpj: string | null;
  status: string;
  // Campos preenchidos de forma assíncrona ao buscar do Asaas
  valorAtual?: number | null;
  statusAsaas?: string;
  loadingValor?: boolean;
  indicadosPagos?: number;
}

export default function PlanosClient() {
  const [empresas, setEmpresas] = useState<EmpresaPlan[]>([]);
  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [empresaEditando, setEmpresaEditando] = useState<EmpresaPlan | null>(
    null,
  );
  const [novoValor, setNovoValor] = useState<string>("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    carregarEmpresas();
  }, []);

  const carregarEmpresas = async () => {
    setLoading(true);
    try {
      const data = await getEmpresasComAssinatura();
      // Seta inicialmente como "carregando o valor" para ir buscando individualmente
      const preparadas: EmpresaPlan[] = data.map((e: any) => ({
        ...e,
        loadingValor: true,
      }));
      setEmpresas(preparadas);

      // Inicia a busca asssíncrona paralela pelos valores de assinatura no asaas
      preparadas.forEach((empresa) => {
        carregarValorAssinatura(empresa.id, empresa.asaasSubscriptionId);
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível carregar as assinaturas",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const carregarValorAssinatura = async (
    id: string,
    asaasSubscriptionId: string,
  ) => {
    try {
      const detalhes = await getValorAssinatura(asaasSubscriptionId);
      setEmpresas((prev) =>
        prev.map((emp) =>
          emp.id === id
            ? {
                ...emp,
                valorAtual: detalhes.value,
                statusAsaas: detalhes.status,
                loadingValor: false,
              }
            : emp,
        ),
      );
    } catch (error) {
      setEmpresas((prev) =>
        prev.map((emp) =>
          emp.id === id
            ? {
                ...emp,
                loadingValor: false,
                valorAtual: null,
                statusAsaas: "ERRO",
              }
            : emp,
        ),
      );
    }
  };

  const recarregarValores = () => {
    empresas.forEach((empresa) => {
      setEmpresas((prev) =>
        prev.map((emp) =>
          emp.id === empresa.id ? { ...emp, loadingValor: true } : emp,
        ),
      );
      carregarValorAssinatura(empresa.id, empresa.asaasSubscriptionId);
    });
  };

  const abrirDialogEdicao = (empresa: EmpresaPlan) => {
    setEmpresaEditando(empresa);
    setNovoValor(empresa.valorAtual ? empresa.valorAtual.toString() : "");
    setDialogOpen(true);
  };

  const fecharDialog = () => {
    setDialogOpen(false);
    setEmpresaEditando(null);
    setNovoValor("");
  };

  const salvarNovoValor = async () => {
    if (!empresaEditando) return;

    const valorFloat = parseFloat(novoValor.replace(",", "."));
    if (isNaN(valorFloat) || valorFloat <= 0) {
      toast({
        title: "Erro de Validação",
        description: "O valor informado é inválido.",
        variant: "destructive",
      });
      return;
    }

    setSalvando(true);
    try {
      await atualizarValorAssinatura(
        empresaEditando.asaasSubscriptionId,
        valorFloat,
      );

      toast({
        title: "Sucesso",
        description: "O valor da assinatura no Asaas foi atualizado!",
      });

      // Atualiza na listagem local
      setEmpresas((prev) =>
        prev.map((emp) =>
          emp.id === empresaEditando.id
            ? { ...emp, valorAtual: valorFloat }
            : emp,
        ),
      );

      fecharDialog();
    } catch (error: any) {
      toast({
        title: "Erro ao Atualizar",
        description:
          error.message || "Houve uma falha ao comunicar com o Asaas.",
        variant: "destructive",
      });
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white dark:bg-zinc-900 p-4 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800">
        <div>
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-500" /> Assinaturas
            Ativas
          </h3>
          <p className="text-sm text-zinc-500">
            Gerencie o valor mensal (ou anual) de cada cliente cadastrado em
            nosso gateway.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={recarregarValores}
          disabled={loading}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Sincronizar
        </Button>
      </div>

      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-zinc-50 dark:bg-zinc-800/50">
            <TableRow>
              <TableHead>Empresa</TableHead>
              <TableHead>Documento</TableHead>
              <TableHead>Status Asaas</TableHead>
              <TableHead className="text-center">Indicações (Ativas)</TableHead>
              <TableHead className="text-right">Valor do Plano</TableHead>
              <TableHead className="text-center">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && empresas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center h-32">
                  <div className="flex flex-col items-center justify-center text-zinc-500 gap-2">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span>Buscando assinaturas...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : empresas.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center h-32 text-zinc-500"
                >
                  Nenhuma empresa com assinatura Asaas configurada.
                </TableCell>
              </TableRow>
            ) : (
              empresas.map((empresa) => (
                <TableRow key={empresa.id}>
                  <TableCell className="font-medium">{empresa.nome}</TableCell>
                  <TableCell className="text-zinc-500">
                    {empresa.cpfCnpj || "-"}
                  </TableCell>
                  <TableCell>
                    {empresa.statusAsaas === "ACTIVE" && (
                      <Badge
                        variant="default"
                        className="bg-emerald-500 hover:bg-emerald-600"
                      >
                        Ativa
                      </Badge>
                    )}
                    {empresa.statusAsaas === "INACTIVE" && (
                      <Badge variant="secondary">Inativa</Badge>
                    )}
                    {empresa.statusAsaas === "ERRO" && (
                      <Badge
                        variant="destructive"
                        className="flex w-min items-center gap-1"
                      >
                        <AlertCircle className="w-3 h-3" /> Falha
                      </Badge>
                    )}
                    {!empresa.statusAsaas && !empresa.loadingValor && (
                      <Badge variant="outline">Desconhecido</Badge>
                    )}
                    {empresa.loadingValor && (
                      <div className="flex items-center text-zinc-400 text-xs gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" /> Sync...
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {empresa.indicadosPagos != null &&
                    empresa.indicadosPagos > 0 ? (
                      <Badge
                        variant="secondary"
                        className="bg-amber-100 text-amber-800 hover:bg-amber-200"
                      >
                        ⭐ {empresa.indicadosPagos} indicações
                      </Badge>
                    ) : (
                      <span className="text-zinc-400 text-xs">Nenhuma</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {empresa.loadingValor ? (
                      <span className="text-zinc-300 dark:text-zinc-600 animate-pulse">
                        R$ --,--
                      </span>
                    ) : empresa.valorAtual ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                        {formatCurrency(empresa.valorAtual)}
                      </span>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => abrirDialogEdicao(empresa)}
                      disabled={empresa.loadingValor || !empresa.valorAtual}
                    >
                      Alterar Valor
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Ajustar Valor da Assinatura</DialogTitle>
            <DialogDescription>
              Esse valor será refletido na próxima cobrança da{" "}
              <b>{empresaEditando?.nome}</b> gerada pelo Asaas.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="valor" className="text-right">
                Valor Novo (R$)
              </Label>
              <Input
                id="valor"
                type="number"
                step="0.01"
                min="0.01"
                className="col-span-3"
                value={novoValor}
                onChange={(e) => setNovoValor(e.target.value)}
                placeholder="Ex: 89.90"
              />
            </div>
            {empresaEditando && (
              <div className="col-span-4 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 text-xs p-3 rounded-md border border-yellow-200 dark:border-yellow-800/50 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <p>
                  As assinaturas ou faturas já pendentes ou aguardando pagamento
                  neste exato momento e que já foram geradas manterão o preço
                  original. O reajuste aplica-se em faturas que não foram
                  consolidadas ainda.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={fecharDialog} disabled={salvando}>
              Cancelar
            </Button>
            <Button onClick={salvarNovoValor} disabled={salvando || !novoValor}>
              {salvando ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Salvar Modificações"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
