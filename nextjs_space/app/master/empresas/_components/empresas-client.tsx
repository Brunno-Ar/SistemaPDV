"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Building2,
  Plus,
  Check,
  Clock,
  Pause,
  RefreshCw,
  Trash2,
  Key,
  MessageSquare,
  DollarSign,
  Users,
  Package,
  ExternalLink,
  Eraser,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

interface Empresa {
  id: string;
  nome: string;
  status: "PENDENTE" | "ATIVO" | "PAUSADO";
  vencimentoPlano: string | null;
  createdAt: string;
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
    // Reset form quando o dialog é fechado
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

      // ✅ Fecha o dialog usando o handler que reseta o form
      handleDialogChange(false);

      // ✅ Re-fetch após fechar
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

  const handleResetSenha = async (empresaId: string) => {
    try {
      // Buscar primeiro admin da empresa
      const usersResponse = await fetch(
        `/api/master/empresas?empresaId=${empresaId}`
      );
      const data = await usersResponse.json();
      const empresa = Array.isArray(data) ? data[0] : data;

      if (!empresa) {
        throw new Error("Empresa não encontrada");
      }

      const adminUser = empresa.users?.find((u: any) => u.role === "admin");

      if (!adminUser) {
        throw new Error("Nenhum admin encontrado nesta empresa");
      }

      await handleAction("resetSenha", empresaId, adminUser.id);

      toast({
        title: "Senha Resetada",
        description: `Senha do admin ${adminUser.email} resetada para: Mudar123`,
      });
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ATIVO":
        return <Badge className="bg-green-500">Ativo</Badge>;
      case "PENDENTE":
        return <Badge variant="secondary">Pendente</Badge>;
      case "PAUSADO":
        return <Badge variant="destructive">Pausado</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return "Não definido";
    return new Date(date).toLocaleDateString("pt-BR");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        Carregando empresas...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gestão de Empresas (SaaS)</h1>
          <p className="text-gray-600">
            Controle de planos, aprovação e segurança
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={handleDialogChange}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nova Empresa
            </Button>
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
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Criando..." : "Criar Empresa"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Lista de Empresas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {empresas.map((empresa) => (
          <Card
            key={empresa.id}
            className="relative cursor-pointer transition-all hover:border-primary/50 hover:shadow-md"
            onClick={() => router.push(`/master/empresas/${empresa.id}`)}
          >
            <CardHeader className="relative z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Building2 className="h-5 w-5 text-blue-600" />
                  <CardTitle className="text-lg">{empresa.nome}</CardTitle>
                  <ExternalLink className="h-4 w-4 text-gray-400" />
                </div>
                {getStatusBadge(empresa.status)}
              </div>
              <p className="text-sm text-gray-600">
                Vencimento: {formatDate(empresa.vencimentoPlano)}
              </p>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="space-y-3">
                {/* Estatísticas */}
                <div className="grid grid-cols-3 gap-2 text-center bg-gray-50 p-2 rounded">
                  <div>
                    <Users className="h-4 w-4 mx-auto text-gray-600" />
                    <p className="text-sm font-semibold">
                      {empresa._count.users}
                    </p>
                    <p className="text-xs text-gray-600">Usuários</p>
                  </div>
                  <div>
                    <Package className="h-4 w-4 mx-auto text-gray-600" />
                    <p className="text-sm font-semibold">
                      {empresa._count.products}
                    </p>
                    <p className="text-xs text-gray-600">Produtos</p>
                  </div>
                  <div>
                    <DollarSign className="h-4 w-4 mx-auto text-gray-600" />
                    <p className="text-sm font-semibold">
                      {empresa._count.sales}
                    </p>
                    <p className="text-xs text-gray-600">Vendas</p>
                  </div>
                </div>

                {/* Ações SaaS */}
                <div className="flex flex-wrap gap-2 relative z-10">
                  {empresa.status === "PENDENTE" && (
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAction("aprovar", empresa.id);
                      }}
                      className="bg-green-600 hover:bg-green-700 relative"
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Aprovar
                    </Button>
                  )}

                  {empresa.status === "ATIVO" && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAction("renovar", empresa.id);
                        }}
                        className="relative"
                      >
                        <RefreshCw className="h-4 w-4 mr-1" />
                        +30d
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAction("pausar", empresa.id);
                        }}
                        className="relative"
                      >
                        <Pause className="h-4 w-4 mr-1" />
                        Pausar
                      </Button>
                    </>
                  )}

                  {empresa.status === "PAUSADO" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAction("reativar", empresa.id);
                      }}
                      className="bg-green-50 relative"
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Reativar
                    </Button>
                  )}

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleResetSenha(empresa.id);
                    }}
                    className="relative"
                  >
                    <Key className="h-4 w-4 mr-1" />
                    Reset
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedEmpresa(empresa);
                      setAvisoDialogOpen(true);
                    }}
                    className="relative"
                  >
                    <MessageSquare className="h-4 w-4 mr-1" />
                    Aviso
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenClearDataDialog(empresa);
                    }}
                    className="relative text-orange-600 hover:bg-orange-50 hover:text-orange-700 border-orange-200"
                    title="Limpar Dados de Teste"
                  >
                    <Eraser className="h-4 w-4" />
                  </Button>

                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenDeleteDialog(empresa);
                    }}
                    className="relative"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Criar Aviso Dialog */}
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
            <Button onClick={handleCriarAviso} className="w-full">
              Criar Aviso
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog com Input */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza absoluta?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <p>
                Esta ação é{" "}
                <strong className="text-red-600">IRREVERSÍVEL</strong> e
                excluirá permanentemente a empresa{" "}
                <strong className="text-black">{empresaToDelete?.nome}</strong>e
                todos os dados relacionados:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>{empresaToDelete?._count.users || 0} usuário(s)</li>
                <li>{empresaToDelete?._count.products || 0} produto(s)</li>
                <li>{empresaToDelete?._count.sales || 0} venda(s)</li>
              </ul>
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
            <AlertDialogCancel
              onClick={() => {
                setDeleteConfirmText("");
                setEmpresaToDelete(null);
              }}
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deleteConfirmText !== empresaToDelete?.nome}
              className="bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Excluir Permanentemente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Clear Data Confirmation Dialog */}
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
                <strong className="text-black">{empresaToClear?.nome}</strong>:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                <li>Todas as Vendas e Itens</li>
                <li>Todo o Histórico de Estoque</li>
                <li>Todos os Caixas e Avisos</li>
                <li>
                  <strong>
                    O Estoque Físico (Lotes) será MANTIDO. Apenas o histórico
                    financeiro será apagado.
                  </strong>
                </li>
              </ul>
              <p className="text-sm">
                * A empresa, usuários e o cadastro de produtos{" "}
                <strong>NÃO</strong> serão excluídos.
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
            <AlertDialogCancel
              onClick={() => {
                setClearDataConfirmText("");
                setEmpresaToClear(null);
              }}
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmClearData}
              disabled={clearDataConfirmText !== "LIMPAR DADOS"}
              className="bg-orange-600 hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Limpar Tudo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
