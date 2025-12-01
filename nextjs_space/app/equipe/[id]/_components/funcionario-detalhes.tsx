"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";
import {
  EmployeeKPIs,
  CashAuditTable,
  EmployeeActions,
} from "./parts";

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
      const response = await fetch(
        `/api/admin/equipe/${funcionarioId}?t=${new Date().getTime()}`
      );
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
        body: JSON.stringify({ metaMensal: meta.replace(",", ".") }),
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

      <EmployeeKPIs
        funcionario={funcionario}
        meta={meta}
        setMeta={setMeta}
        handleUpdateMeta={handleUpdateMeta}
        savingMeta={savingMeta}
        formatCurrency={formatCurrency}
      />

      <CashAuditTable
        caixas={funcionario.caixas}
        formatCurrency={formatCurrency}
      />

      <EmployeeActions
        funcionario={funcionario}
        dialogAvisoOpen={dialogAvisoOpen}
        setDialogAvisoOpen={setDialogAvisoOpen}
        mensagemAviso={mensagemAviso}
        setMensagemAviso={setMensagemAviso}
        handleSendAviso={handleSendAviso}
        sendingAviso={sendingAviso}
        deleteDialogOpen={deleteDialogOpen}
        setDeleteDialogOpen={setDeleteDialogOpen}
        handleDeleteFuncionario={handleDeleteFuncionario}
        deleting={deleting}
      />
    </div>
  );
}
