"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  DollarSign,
  Target,
  Mail,
  Inbox,
  Trash2,
  Eye,
} from "lucide-react";
import { InteractiveHoverButton } from "@/components/ui/interactive-hover-button";
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
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface FuncionarioDetalhesProps {
  funcionarioId: string;
}

// Format currency
const formatCurrency = (value: number | string) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value));
};

export default function FuncionarioDetalhes({
  funcionarioId,
}: FuncionarioDetalhesProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [funcionario, setFuncionario] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState("");
  const [mensagemAviso, setMensagemAviso] = useState("");
  const [dialogAvisoOpen, setDialogAvisoOpen] = useState(false);
  const [savingMeta, setSavingMeta] = useState(false);
  const [sendingAviso, setSendingAviso] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDeleteFuncionario = async () => {
    setDeleting(true);
    try {
      const response = await fetch(`/api/admin/equipe?id=${funcionarioId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Erro ao excluir funcionário");
      }

      toast({
        title: "Sucesso",
        description: "Funcionário excluído com sucesso.",
      });
      router.push("/equipe");
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  useEffect(() => {
    if (session?.user?.id === funcionarioId) {
      toast({
        title: "Acesso Negado",
        description: "Você não pode gerenciar seu próprio perfil aqui.",
        variant: "destructive",
      });
      router.push("/equipe");
      return;
    }
    fetchFuncionario();
  }, [funcionarioId, session]);

  const fetchFuncionario = async () => {
    try {
      const response = await fetch(`/api/admin/equipe/${funcionarioId}`);
      if (!response.ok) throw new Error("Erro ao carregar funcionário");
      const data = await response.json();
      setFuncionario(data);
      setMeta(data.metaMensal || "0");
    } catch (error) {
      console.error(error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados do funcionário.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateMeta = async () => {
    setSavingMeta(true);
    try {
      const response = await fetch(`/api/admin/equipe/${funcionarioId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ metaMensal: meta }),
      });

      if (!response.ok) throw new Error("Erro ao atualizar meta");

      toast({
        title: "Sucesso",
        description: "Meta mensal atualizada com sucesso!",
      });
      fetchFuncionario();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao atualizar a meta.",
        variant: "destructive",
      });
    } finally {
      setSavingMeta(false);
    }
  };

  const handleSendAviso = async () => {
    if (!mensagemAviso.trim()) return;
    setSendingAviso(true);
    try {
      const response = await fetch("/api/avisos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mensagem: mensagemAviso,
          destinatarioId: funcionarioId,
          importante: true,
        }),
      });

      if (!response.ok) throw new Error("Erro ao enviar aviso");

      toast({
        title: "Sucesso",
        description: "Aviso enviado com sucesso!",
      });
      setDialogAvisoOpen(false);
      setMensagemAviso("");
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao enviar o aviso.",
        variant: "destructive",
      });
    } finally {
      setSendingAviso(false);
    }
  };

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
    return (
      <Badge variant="destructive">
        {formatCurrency(val)}
      </Badge>
    );
  };

  if (loading) {
    return <div className="p-8 text-center">Carregando...</div>;
  }

  if (!funcionario) {
    return <div className="p-8 text-center">Funcionário não encontrado.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {funcionario.nome || funcionario.name || funcionario.email}
          </h1>
          <p className="text-gray-500">{funcionario.email}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card de Vendas */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vendas no Mês</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(funcionario.totalVendasMes)}
            </div>
            <p className="text-xs text-muted-foreground">
              {funcionario._count.sales} vendas realizadas
            </p>
          </CardContent>
        </Card>

        {/* Card de Caixas */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Caixas Abertos
            </CardTitle>
            <Inbox className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {funcionario._count.caixas}
            </div>
            <p className="text-xs text-muted-foreground">Total histórico</p>
          </CardContent>
        </Card>

        {/* Card de Meta */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Meta Mensal</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold">R$</span>
              <Input
                type="number"
                value={meta}
                onChange={(e) => setMeta(e.target.value)}
                className="h-8 w-32"
              />
              <Button
                size="sm"
                onClick={handleUpdateMeta}
                disabled={savingMeta}
                variant="outline"
              >
                {savingMeta ? "..." : "Salvar"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Progresso:{" "}
              {Number(meta) > 0
                ? (
                    (Number(funcionario.totalVendasMes) / Number(meta)) *
                    100
                  ).toFixed(1)
                : 0}
              %
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Auditoria de Caixa */}
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
                  {funcionario.caixas && funcionario.caixas.length > 0 ? (
                    funcionario.caixas.map((caixa: any) => (
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
                                            <TableCell className="max-w-[150px] truncate" title={mov.descricao}>
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

      {/* Ações */}
      <Card>
        <CardHeader>
          <CardTitle>Ações de Gestão</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Dialog open={dialogAvisoOpen} onOpenChange={setDialogAvisoOpen}>
              <DialogTrigger asChild>
                <InteractiveHoverButton className="bg-blue-600 text-white hover:bg-blue-700">
                  <Mail className="mr-2 h-4 w-4" />
                  Enviar Aviso / Notificação
                </InteractiveHoverButton>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    Enviar Aviso para {funcionario.nome}
                  </DialogTitle>
                  <DialogDescription>
                    Esta mensagem aparecerá no mural de avisos do funcionário.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Mensagem</Label>
                    <Textarea
                      placeholder="Digite sua mensagem aqui..."
                      value={mensagemAviso}
                      onChange={(e) => setMensagemAviso(e.target.value)}
                      rows={4}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setDialogAvisoOpen(false)}
                    >
                      Cancelar
                    </Button>
                    <Button onClick={handleSendAviso} disabled={sendingAviso}>
                      {sendingAviso ? "Enviando..." : "Enviar"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <DialogTrigger asChild>
                <InteractiveHoverButton className="bg-red-500 text-white hover:bg-red-600 border-red-600">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Excluir Funcionário
                </InteractiveHoverButton>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Excluir Funcionário</DialogTitle>
                  <DialogDescription>
                    Tem certeza que deseja excluir{" "}
                    <strong>{funcionario.nome}</strong>? Esta ação não pode ser
                    desfeita e removerá o acesso deste usuário ao sistema.
                  </DialogDescription>
                </DialogHeader>
                <div className="flex justify-end gap-2 mt-4">
                  <Button
                    variant="outline"
                    onClick={() => setDeleteDialogOpen(false)}
                    disabled={deleting}
                  >
                    Cancelar
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleDeleteFuncionario}
                    disabled={deleting}
                  >
                    {deleting ? "Excluindo..." : "Confirmar Exclusão"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
