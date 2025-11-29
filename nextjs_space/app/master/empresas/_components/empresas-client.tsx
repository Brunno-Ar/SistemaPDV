"use client";

import { InteractiveHoverButton } from "@/components/ui/interactive-hover-button";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Search,
  Plus,
  MoreVertical,
  CheckCircle,
  PauseCircle,
  RotateCw,
  Trash2,
  Eye,
  Eraser,
  MessageSquare,
  Key,
  ChevronDown,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Empresa {
  id: string;
  nome: string;
  status: "PENDENTE" | "ATIVO" | "PAUSADO";
  vencimentoPlano: string | null;
  createdAt: string;
  faturamentoTotal: number;
  _count: {
    users: number;
    products: number;
    sales: number;
  };
}

export default function EmpresasClient() {
  const router = useRouter();
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

  const handleOpenDeleteDialog = (empresa: Empresa) => {
    setEmpresaToDelete(empresa);
    setDeleteConfirmText("");
    setDeleteDialogOpen(true);
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

  // --- Lógica de Limpeza de Dados ---
  const [clearDataDialogOpen, setClearDataDialogOpen] = useState(false);
  const [clearDataConfirmText, setClearDataConfirmText] = useState("");
  const [empresaToClear, setEmpresaToClear] = useState<Empresa | null>(null);

  const handleOpenClearDataDialog = (empresa: Empresa) => {
    setEmpresaToClear(empresa);
    setClearDataConfirmText("");
    setClearDataDialogOpen(true);
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
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Nova Empresa</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="nomeEmpresa">Nome da Empresa</Label>
                <Input
                  id="nomeEmpresa"
                  value={formData.nomeEmpresa}
                  onChange={(e) =>
                    setFormData({ ...formData, nomeEmpresa: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="adminNome">Nome do Admin</Label>
                <Input
                  id="adminNome"
                  value={formData.adminNome}
                  onChange={(e) =>
                    setFormData({ ...formData, adminNome: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="adminEmail">Email do Admin</Label>
                <Input
                  id="adminEmail"
                  type="email"
                  value={formData.adminEmail}
                  onChange={(e) =>
                    setFormData({ ...formData, adminEmail: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="adminSenha">Senha do Admin</Label>
                <Input
                  id="adminSenha"
                  type="password"
                  value={formData.adminSenha}
                  onChange={(e) =>
                    setFormData({ ...formData, adminSenha: e.target.value })
                  }
                  required
                />
              </div>
              <InteractiveHoverButton
                type="submit"
                className="w-full bg-cta-bg text-white border-cta-bg hover:bg-cta-bg/90"
                disabled={submitting}
              >
                {submitting ? "Criando..." : "Criar Empresa"}
              </InteractiveHoverButton>
            </form>
          </DialogContent>
        </Dialog>
      </header>

      {/* Search and Filters Section */}
      <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm mb-6">
        <div className="flex flex-col md:flex-row items-center gap-4">
          {/* SearchBar */}
          <div className="w-full md:flex-1">
            <label className="flex flex-col w-full">
              <div className="flex w-full flex-1 items-stretch rounded-lg h-14">
                <div className="text-gray-500 dark:text-gray-400 flex bg-gray-50 dark:bg-zinc-800 items-center justify-center px-4 rounded-l-lg border border-gray-300 dark:border-zinc-700 border-r-0">
                  <Search className="h-5 w-5" />
                </div>
                <input
                  className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-r-lg text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-300 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 h-14 placeholder:text-gray-400 dark:placeholder:text-gray-500 px-4 text-base font-normal leading-normal"
                  placeholder="Buscar por nome..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </label>
          </div>
          {/* Chips */}
          <div className="flex gap-2 flex-wrap items-center justify-center md:justify-end">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mr-2 hidden md:block">
              Filtros:
            </p>
            {["Todos", "Pendente", "Ativa", "Inadimplente", "Pausada"].map(
              (status) => {
                let activeClass =
                  "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"; // Default (Todos)
                if (status === "Pendente")
                  activeClass =
                    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
                if (status === "Ativa")
                  activeClass =
                    "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
                if (status === "Inadimplente")
                  activeClass =
                    "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
                if (status === "Pausada")
                  activeClass =
                    "bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-200";

                return (
                  <button
                    key={status}
                    onClick={() => setFilterStatus(status)}
                    className={`flex h-10 shrink-0 items-center justify-center gap-x-2 rounded-full px-4 text-sm font-medium transition-colors ${
                      filterStatus === status
                        ? activeClass
                        : "bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-600 dark:text-gray-400"
                    }`}
                  >
                    {status}
                    {filterStatus === status && (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </button>
                );
              }
            )}
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="overflow-x-auto bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm">
        <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
          <thead className="text-xs text-gray-700 dark:text-gray-300 uppercase bg-gray-50 dark:bg-zinc-800/50">
            <tr>
              <th className="px-6 py-3" scope="col">
                Empresa
              </th>
              <th className="px-6 py-3" scope="col">
                Data de Cadastro
              </th>
              <th className="px-6 py-3" scope="col">
                Faturamento
              </th>
              <th className="px-6 py-3 text-center" scope="col">
                Status
              </th>
              <th className="px-6 py-3" scope="col">
                Vencimento
              </th>
              <th className="px-6 py-3 text-right" scope="col">
                Ações
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredEmpresas.map((empresa) => {
              const inadimplente = isInadimplente(empresa);
              return (
                <tr
                  key={empresa.id}
                  className="bg-white dark:bg-zinc-900 border-b dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors"
                >
                  <th
                    className="px-6 py-4 font-bold text-gray-900 dark:text-white whitespace-nowrap align-middle"
                    scope="row"
                  >
                    {empresa.nome}
                  </th>
                  <td className="px-6 py-4 text-gray-500 dark:text-gray-400 align-middle">
                    {formatDate(empresa.createdAt)}
                  </td>
                  <td className="px-6 py-4 font-bold text-green-600 dark:text-green-400 align-middle">
                    {formatCurrency(empresa.faturamentoTotal)}
                  </td>
                  <td className="px-6 py-4 align-middle text-center">
                    {empresa.status === "ATIVO" && !inadimplente && (
                      <span className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 border border-green-200 dark:border-green-800">
                        <span className="size-2 inline-block bg-green-500 rounded-full"></span>
                        Ativa
                      </span>
                    )}
                    {empresa.status === "PENDENTE" && (
                      <span className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800">
                        <span className="size-2 inline-block bg-yellow-500 rounded-full"></span>
                        Pendente
                      </span>
                    )}
                    {inadimplente && (
                      <span className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300 border border-red-200 dark:border-red-800">
                        <span className="size-2 inline-block bg-red-500 rounded-full"></span>
                        Inadimplente
                      </span>
                    )}
                    {empresa.status === "PAUSADO" && (
                      <span className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600">
                        <span className="size-2 inline-block bg-gray-500 rounded-full"></span>
                        Pausada
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 align-middle">
                    {formatDate(empresa.vencimentoPlano)}
                  </td>
                  <td className="px-6 py-4 text-right align-middle">
                    <div className="flex items-center justify-end gap-2">
                      <InteractiveHoverButton
                        className="w-10 min-w-10 px-0 border-blue-200 dark:border-blue-900 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                        title="Detalhes"
                        onClick={() =>
                          router.push(`/master/empresas/${empresa.id}`)
                        }
                      >
                        <Eye className="h-5 w-5" />
                      </InteractiveHoverButton>

                      {empresa.status === "PENDENTE" && (
                        <InteractiveHoverButton
                          className="w-10 min-w-10 px-0 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800 border-green-200"
                          title="Aprovar Cadastro"
                          onClick={() => handleAction("aprovar", empresa.id)}
                        >
                          <CheckCircle className="h-5 w-5" />
                        </InteractiveHoverButton>
                      )}

                      {empresa.status === "ATIVO" && (
                        <>
                          <InteractiveHoverButton
                            className="w-10 min-w-10 px-0 hover:bg-gray-200 dark:hover:bg-gray-700 border-gray-200"
                            title="Renovar Plano"
                            onClick={() => handleAction("renovar", empresa.id)}
                          >
                            <RotateCw className="h-5 w-5" />
                          </InteractiveHoverButton>
                          <InteractiveHoverButton
                            className="w-10 min-w-10 px-0 hover:bg-gray-200 dark:hover:bg-gray-700 text-yellow-600 border-yellow-200"
                            title="Pausar"
                            onClick={() => handleAction("pausar", empresa.id)}
                          >
                            <PauseCircle className="h-5 w-5" />
                          </InteractiveHoverButton>
                        </>
                      )}

                      {empresa.status === "PAUSADO" && (
                        <InteractiveHoverButton
                          className="w-10 min-w-10 px-0 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800 border-green-200"
                          title="Reativar"
                          onClick={() => handleAction("reativar", empresa.id)}
                        >
                          <CheckCircle className="h-5 w-5" />
                        </InteractiveHoverButton>
                      )}

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <InteractiveHoverButton
                            className="w-10 min-w-10 px-0 hover:bg-gray-200 dark:hover:bg-gray-700 border-gray-200"
                            title="Mais Opções"
                          >
                            <MoreVertical className="h-5 w-5" />
                          </InteractiveHoverButton>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Ações</DropdownMenuLabel>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.preventDefault();
                              setEmpresaToReset(empresa);
                              setResetPasswordDialogOpen(true);
                            }}
                          >
                            <Key className="mr-2 h-4 w-4" /> Resetar Senha
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedEmpresa(empresa);
                              setAvisoDialogOpen(true);
                            }}
                          >
                            <MessageSquare className="mr-2 h-4 w-4" /> Enviar
                            Aviso
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-orange-600 focus:text-orange-600"
                            onClick={() => handleOpenClearDataDialog(empresa)}
                          >
                            <Eraser className="mr-2 h-4 w-4" /> Limpar Dados
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-600 focus:text-red-600"
                            onClick={() => handleOpenDeleteDialog(empresa)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Excluir Empresa
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Dialogs (Invisíveis até serem ativados) */}
      <Dialog open={avisoDialogOpen} onOpenChange={setAvisoDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Aviso para: {selectedEmpresa?.nome}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="mensagem">Mensagem</Label>
              <Textarea
                id="mensagem"
                value={avisoData.mensagem}
                onChange={(e) =>
                  setAvisoData({ ...avisoData, mensagem: e.target.value })
                }
                placeholder="Digite o aviso..."
                rows={4}
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="importante"
                checked={avisoData.importante}
                onChange={(e) =>
                  setAvisoData({ ...avisoData, importante: e.target.checked })
                }
              />
              <Label htmlFor="importante">Marcar como importante</Label>
            </div>
            <InteractiveHoverButton
              onClick={handleCriarAviso}
              className="w-full bg-primary text-primary-foreground border-primary hover:bg-primary/90"
            >
              Criar Aviso
            </InteractiveHoverButton>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza absoluta?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <p>
                Esta ação é{" "}
                <strong className="text-red-600">IRREVERSÍVEL</strong> e
                excluirá permanentemente a empresa{" "}
                <strong className="text-black">{empresaToDelete?.nome}</strong>{" "}
                e todos os dados relacionados.
              </p>
              <div className="space-y-2 pt-2">
                <p className="font-semibold">
                  Digite{" "}
                  <span className="text-red-600 font-mono">
                    {empresaToDelete?.nome}
                  </span>{" "}
                  abaixo para confirmar:
                </p>
                <Input
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="Digite o nome da empresa"
                  className="font-mono"
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <InteractiveHoverButton
              className="bg-white hover:bg-gray-50 text-gray-700 border-gray-200"
              onClick={() => {
                setDeleteConfirmText("");
                setEmpresaToDelete(null);
                setDeleteDialogOpen(false);
              }}
            >
              Cancelar
            </InteractiveHoverButton>
            <InteractiveHoverButton
              onClick={handleConfirmDelete}
              disabled={deleteConfirmText !== empresaToDelete?.nome}
              className="bg-red-600 hover:bg-red-700 text-white border-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Excluir Permanentemente
            </InteractiveHoverButton>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={clearDataDialogOpen}
        onOpenChange={setClearDataDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Limpar Dados de Teste?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <div className="bg-orange-50 border border-orange-200 rounded p-3 text-orange-800 text-sm">
                ⚠️ <strong>Atenção:</strong> Esta ação é ideal para zerar uma
                conta após testes.
              </div>
              <p>
                Você está prestes a apagar <strong>TODAS</strong> as
                movimentações da empresa{" "}
                <strong className="text-black">{empresaToClear?.nome}</strong>.
              </p>
              <div className="space-y-2 pt-2">
                <p className="font-semibold text-sm">
                  Digite{" "}
                  <span className="text-red-600 font-mono">LIMPAR DADOS</span>{" "}
                  abaixo para confirmar:
                </p>
                <Input
                  value={clearDataConfirmText}
                  onChange={(e) =>
                    setClearDataConfirmText(e.target.value.toUpperCase())
                  }
                  placeholder="LIMPAR DADOS"
                  className="font-mono uppercase"
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <InteractiveHoverButton
              className="bg-white hover:bg-gray-50 text-gray-700 border-gray-200"
              onClick={() => {
                setClearDataConfirmText("");
                setEmpresaToClear(null);
                setClearDataDialogOpen(false);
              }}
            >
              Cancelar
            </InteractiveHoverButton>
            <InteractiveHoverButton
              onClick={handleConfirmClearData}
              disabled={clearDataConfirmText !== "LIMPAR DADOS"}
              className="bg-orange-600 hover:bg-orange-700 text-white border-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Limpar Tudo
            </InteractiveHoverButton>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={resetPasswordDialogOpen}
        onOpenChange={setResetPasswordDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Resetar Senha do Administrador?</AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a resetar a senha do admin da empresa{" "}
              <strong className="text-black">{empresaToReset?.nome}</strong>. A
              senha temporária será definida como{" "}
              <strong className="text-black">Mudar123</strong>. O usuário
              precisará alterá-la no próximo login.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <InteractiveHoverButton
              className="bg-white hover:bg-gray-50 text-gray-700 border-gray-200"
              onClick={() => {
                setResetPasswordDialogOpen(false);
                setEmpresaToReset(null);
              }}
            >
              Cancelar
            </InteractiveHoverButton>
            <InteractiveHoverButton
              onClick={confirmResetSenha}
              className="bg-orange-600 hover:bg-orange-700 text-white border-orange-600"
            >
              Confirmar Reset
            </InteractiveHoverButton>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog
        open={successPasswordDialogOpen}
        onOpenChange={setSuccessPasswordDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-green-600 flex items-center gap-2">
              <CheckCircle className="h-6 w-6" />
              Senha Resetada com Sucesso!
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4 pt-2">
              <p className="text-base text-gray-700">
                A senha do administrador foi redefinida para:
              </p>
              <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 text-center">
                <span className="text-2xl font-mono font-bold text-slate-900 dark:text-white tracking-wider select-all">
                  Mudar123
                </span>
              </div>
              <p className="text-sm text-gray-500">
                Copie esta senha e envie para o administrador. Ele deverá
                alterá-la no próximo login.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <InteractiveHoverButton
              onClick={() => setSuccessPasswordDialogOpen(false)}
              className="w-full bg-green-600 hover:bg-green-700 text-white border-green-600"
            >
              Entendido
            </InteractiveHoverButton>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
