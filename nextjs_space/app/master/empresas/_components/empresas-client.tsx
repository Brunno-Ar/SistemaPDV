"use client";

import { InteractiveHoverButton } from "@/components/ui/interactive-hover-button";
import { useEffect, useState } from "react";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  CompaniesToolbar,
  CompaniesTable,
  CreateCompanyDialog,
  DeleteCompanyAlert,
  ClearDataAlert,
  ResetPasswordDialog,
  SuccessPasswordDialog,
  AvisoDialog,
} from "./parts";
import { Empresa } from "./parts/types";

export default function EmpresasClient() {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [avisoDialogOpen, setAvisoDialogOpen] = useState(false);
  const [selectedEmpresa, setSelectedEmpresa] = useState<Empresa | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [empresaToDelete, setEmpresaToDelete] = useState<Empresa | null>(null);
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [successPasswordDialogOpen, setSuccessPasswordDialogOpen] =
    useState(false);
  const [empresaToReset, setEmpresaToReset] = useState<Empresa | null>(null);
  const [avisoData, setAvisoData] = useState({
    mensagem: "",
    importante: false,
  });
  const [formData, setFormData] = useState({
    nomeEmpresa: "",
    adminEmail: "",
    adminSenha: "",
    adminNome: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("Todos");
  const [searchTerm, setSearchTerm] = useState("");

  // --- Lógica de Limpeza de Dados ---
  const [clearDataDialogOpen, setClearDataDialogOpen] = useState(false);
  const [clearDataConfirmText, setClearDataConfirmText] = useState("");
  const [empresaToClear, setEmpresaToClear] = useState<Empresa | null>(null);

  useEffect(() => {
    fetchEmpresas();
  }, []);

  const fetchEmpresas = async () => {
    try {
      const response = await fetch("/api/master/empresas");
      if (!response.ok) throw new Error("Erro ao buscar empresas");
      const data = await response.json();
      setEmpresas(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Erro ao buscar empresas:", error);
      setEmpresas([]);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as empresas",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDialogChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setFormData({
        nomeEmpresa: "",
        adminEmail: "",
        adminSenha: "",
        adminNome: "",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch("/api/master/empresas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao criar empresa");
      }

      toast({
        title: "Sucesso",
        description: `Empresa "${data.empresa.nome}" criada com sucesso!`,
      });

      handleDialogChange(false);
      fetchEmpresas();
    } catch (error) {
      toast({
        title: "Erro",
        description:
          error instanceof Error ? error.message : "Erro ao criar empresa",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleAction = async (
    action: string,
    empresaId: string,
    userId?: string
  ) => {
    try {
      const response = await fetch("/api/master/empresas/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, empresaId, userId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro na ação");
      }

      toast({
        title: "Sucesso",
        description: data.message,
      });

      fetchEmpresas();
    } catch (error) {
      toast({
        title: "Erro",
        description:
          error instanceof Error ? error.message : "Erro ao executar ação",
        variant: "destructive",
      });
    }
  };

  const confirmResetSenha = async () => {
    if (!empresaToReset) return;
    const empresaId = empresaToReset.id;

    try {
      // Backend agora busca o admin automaticamente
      await handleAction("resetSenha", empresaId);

      setResetPasswordDialogOpen(false);
      setEmpresaToReset(null);

      // Mostrar Dialog de Sucesso com a senha
      setSuccessPasswordDialogOpen(true);
    } catch (error) {
      toast({
        title: "Erro",
        description:
          error instanceof Error ? error.message : "Erro ao resetar senha",
        variant: "destructive",
      });
    }
  };

  const handleCriarAviso = async () => {
    if (!selectedEmpresa || !avisoData.mensagem) {
      toast({
        title: "Erro",
        description: "Preencha a mensagem do aviso",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch("/api/master/empresas/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "criarAviso",
          empresaId: selectedEmpresa.id,
          mensagem: avisoData.mensagem,
          importante: avisoData.importante,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao criar aviso");
      }

      toast({
        title: "Sucesso",
        description: "Aviso criado com sucesso!",
      });

      setAvisoDialogOpen(false);
      setAvisoData({ mensagem: "", importante: false });
    } catch (error) {
      toast({
        title: "Erro",
        description:
          error instanceof Error ? error.message : "Erro ao criar aviso",
        variant: "destructive",
      });
    }
  };

  const handleConfirmDelete = async () => {
    if (!empresaToDelete) return;

    try {
      const response = await fetch("/api/master/empresas", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ empresaId: empresaToDelete.id }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao excluir empresa");
      }

      toast({
        title: "Sucesso",
        description: data.message,
      });

      setDeleteDialogOpen(false);
      setDeleteConfirmText("");
      setEmpresaToDelete(null);
      fetchEmpresas();
    } catch (error) {
      toast({
        title: "Erro",
        description:
          error instanceof Error ? error.message : "Erro ao excluir empresa",
        variant: "destructive",
      });
    }
  };

  const handleConfirmClearData = async () => {
    if (!empresaToClear) return;

    try {
      const response = await fetch("/api/master/empresas/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "limparDadosTeste",
          empresaId: empresaToClear.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao limpar dados");
      }

      toast({
        title: "Sucesso",
        description: data.message,
      });

      setClearDataDialogOpen(false);
      setClearDataConfirmText("");
      setEmpresaToClear(null);
      fetchEmpresas(); // Atualiza a lista para zerar os contadores
    } catch (error) {
      toast({
        title: "Erro",
        description:
          error instanceof Error ? error.message : "Erro ao limpar dados",
        variant: "destructive",
      });
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("pt-BR");
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const isInadimplente = (empresa: Empresa) => {
    if (empresa.status !== "ATIVO" || !empresa.vencimentoPlano) return false;
    return new Date(empresa.vencimentoPlano) < new Date();
  };

  const filteredEmpresas = empresas.filter((empresa) => {
    const matchesSearch = empresa.nome
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesFilter =
      filterStatus === "Todos" ||
      (filterStatus === "Pendente" && empresa.status === "PENDENTE") ||
      (filterStatus === "Ativa" &&
        empresa.status === "ATIVO" &&
        !isInadimplente(empresa)) ||
      (filterStatus === "Inadimplente" && isInadimplente(empresa)) ||
      (filterStatus === "Pausada" && empresa.status === "PAUSADO");

    return matchesSearch && matchesFilter;
  });

  return (
    <div className="max-w-7xl mx-auto">
      {/* PageHeading */}
      <header className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white">
            Gerenciamento de Empresas
          </h1>
          <p className="text-base text-gray-500 dark:text-gray-400">
            Visualize e gerencie todas as empresas cadastradas no sistema.
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={handleDialogChange}>
          <DialogTrigger asChild>
            <InteractiveHoverButton className="bg-cta-bg text-white border-cta-bg hover:bg-cta-bg/90">
              <span className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                <span className="truncate">Cadastrar Nova Empresa</span>
              </span>
            </InteractiveHoverButton>
          </DialogTrigger>
          <CreateCompanyDialog
            open={dialogOpen}
            onOpenChange={handleDialogChange}
            onSubmit={handleSubmit}
            formData={formData}
            setFormData={setFormData}
            submitting={submitting}
          />
        </Dialog>
      </header>

      {/* Search and Filters Section */}
      <CompaniesToolbar
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        filterStatus={filterStatus}
        setFilterStatus={setFilterStatus}
      />

      {/* Data Table */}
      <CompaniesTable
        empresas={filteredEmpresas}
        onAction={handleAction}
        onDelete={(empresa) => {
          setEmpresaToDelete(empresa);
          setDeleteConfirmText("");
          setDeleteDialogOpen(true);
        }}
        onClearData={(empresa) => {
          setEmpresaToClear(empresa);
          setClearDataConfirmText("");
          setClearDataDialogOpen(true);
        }}
        onResetPassword={(empresa) => {
          setEmpresaToReset(empresa);
          setResetPasswordDialogOpen(true);
        }}
        onSendAviso={(empresa) => {
          setSelectedEmpresa(empresa);
          setAvisoDialogOpen(true);
        }}
        formatDate={formatDate}
        formatCurrency={formatCurrency}
        isInadimplente={isInadimplente}
      />

      {/* Dialogs */}
      <AvisoDialog
        open={avisoDialogOpen}
        onOpenChange={setAvisoDialogOpen}
        selectedEmpresa={selectedEmpresa}
        avisoData={avisoData}
        setAvisoData={setAvisoData}
        handleCriarAviso={handleCriarAviso}
      />

      <DeleteCompanyAlert
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        empresaToDelete={empresaToDelete}
        setEmpresaToDelete={setEmpresaToDelete}
        deleteConfirmText={deleteConfirmText}
        setDeleteConfirmText={setDeleteConfirmText}
        handleConfirmDelete={handleConfirmDelete}
      />

      <ClearDataAlert
        open={clearDataDialogOpen}
        onOpenChange={setClearDataDialogOpen}
        empresaToClear={empresaToClear}
        setEmpresaToClear={setEmpresaToClear}
        clearDataConfirmText={clearDataConfirmText}
        setClearDataConfirmText={setClearDataConfirmText}
        handleConfirmClearData={handleConfirmClearData}
      />

      <ResetPasswordDialog
        open={resetPasswordDialogOpen}
        onOpenChange={setResetPasswordDialogOpen}
        empresaToReset={empresaToReset}
        setEmpresaToReset={setEmpresaToReset}
        confirmResetSenha={confirmResetSenha}
      />

      <SuccessPasswordDialog
        open={successPasswordDialogOpen}
        onOpenChange={setSuccessPasswordDialogOpen}
      />
    </div>
  );
}
