"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
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
  Calendar,
  ShoppingBag,
  Inbox,
  Trash2,
} from "lucide-react";
import { InteractiveHoverButton } from "@/components/ui/interactive-hover-button";

interface FuncionarioDetalhesProps {
  funcionarioId: string;
}

export default function FuncionarioDetalhes({
  funcionarioId,
}: FuncionarioDetalhesProps) {
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
    fetchFuncionario();
  }, [funcionarioId]);

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
              R$ {Number(funcionario.totalVendasMes).toFixed(2)}
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
                <Button variant="destructive" className="gap-2">
                  <Trash2 className="h-4 w-4" />
                  Excluir Funcionário
                </Button>
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
