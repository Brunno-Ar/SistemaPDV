"use client";

import { InteractiveHoverButton } from "@/components/ui/interactive-hover-button";
import { AnimatedLoadingSkeleton } from "@/components/ui/loading";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Plus,
  Trash2,
  Mail,
  Calendar,
  Shield,
  Users,
  ArrowLeft,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";

interface Master {
  id: string;
  email: string;
  nome: string;
  name: string;
  createdAt: string;
}

export default function UsuariosClient() {
  const router = useRouter();
  const { data: session } = useSession() || {};
  const [masters, setMasters] = useState<Master[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    senha: "",
    nome: "",
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchMasters();
  }, []);

  const fetchMasters = async () => {
    try {
      const response = await fetch("/api/master/usuarios");
      if (!response.ok) throw new Error("Erro ao buscar usuários master");
      const data = await response.json();

      // Ensure data is an array
      if (Array.isArray(data)) {
        setMasters(data);
      } else {
        setMasters([]);
      }
    } catch (error) {
      console.error("Erro ao buscar usuários master:", error);
      setMasters([]);
      toast({
        title: "Erro",
        description:
          error instanceof Error
            ? error.message
            : "Não foi possível carregar os usuários master",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch("/api/master/usuarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao criar usuário master");
      }

      toast({
        title: "Sucesso!",
        description: "Usuário master criado com sucesso",
      });

      // ✅ Fecha o dialog usando o handler que reseta o form
      handleDialogChange(false);

      // ✅ Re-fetch após fechar
      fetchMasters();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (masterId: string, masterEmail: string) => {
    try {
      const response = await fetch(`/api/master/usuarios?id=${masterId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao excluir usuário master");
      }

      toast({
        title: "Sucesso!",
        description: `Usuário master "${masterEmail}" excluído com sucesso`,
      });

      fetchMasters();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-10">
        <AnimatedLoadingSkeleton />
      </div>
    );
  }

  const currentUserId = session?.user?.id;

  const handleDialogChange = (open: boolean) => {
    setDialogOpen(open);
    // Reset form quando o dialog é fechado
    if (!open) {
      setFormData({
        email: "",
        senha: "",
        nome: "",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-4 mb-2">
            <InteractiveHoverButton
              onClick={() => router.push("/master")}
              className="flex items-center gap-2 border-2 hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:border-purple-300 dark:hover:border-purple-700 bg-white dark:bg-zinc-900 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-zinc-700"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar ao Início
            </InteractiveHoverButton>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
            <Shield className="h-8 w-8 text-purple-600 dark:text-purple-400" />
            Gerenciamento de Masters
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Visualize e gerencie todos os usuários master do sistema
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={handleDialogChange}>
          <DialogTrigger asChild>
            <InteractiveHoverButton className="bg-purple-600 hover:bg-purple-700 text-white border-purple-600">
              <span className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Criar Novo Master
              </span>
            </InteractiveHoverButton>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[450px]">
            <DialogHeader>
              <DialogTitle>Criar Novo Usuário Master</DialogTitle>
              <DialogDescription>
                Preencha os dados do novo usuário master
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) =>
                    setFormData({ ...formData, nome: e.target.value })
                  }
                  placeholder="Nome do usuário master"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="master@email.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="senha">Senha *</Label>
                <Input
                  id="senha"
                  type="password"
                  value={formData.senha}
                  onChange={(e) =>
                    setFormData({ ...formData, senha: e.target.value })
                  }
                  placeholder="Senha do usuário master"
                  required
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <InteractiveHoverButton
                  type="button"
                  className="bg-white hover:bg-gray-50 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-zinc-700"
                  onClick={() => handleDialogChange(false)}
                  disabled={submitting}
                >
                  Cancelar
                </InteractiveHoverButton>
                <InteractiveHoverButton
                  type="submit"
                  disabled={submitting}
                  className="bg-purple-600 hover:bg-purple-700 text-white border-purple-600"
                >
                  {submitting ? "Criando..." : "Criar Master"}
                </InteractiveHoverButton>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-900/10 border-purple-200 dark:border-purple-900/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-purple-700 dark:text-purple-300 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Total de Masters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-900 dark:text-purple-100">
              {masters.length}
            </div>
            <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
              Usuários cadastrados
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-900/10 border-blue-200 dark:border-blue-900/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-300 flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Sua Conta
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-semibold text-blue-900 dark:text-blue-100 truncate">
              {session?.user?.email}
            </div>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
              Master atual
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-900/10 border-green-200 dark:border-green-900/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-green-700 dark:text-green-300 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Último Cadastro
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-semibold text-green-900 dark:text-green-100">
              {masters.length > 0
                ? new Date(
                    masters[masters.length - 1].createdAt
                  ).toLocaleDateString("pt-BR")
                : "N/A"}
            </div>
            <p className="text-xs text-green-600 dark:text-green-400 mt-1">
              Data do último master
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Masters List */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Lista de Usuários Master
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {masters.map((master) => (
            <Card
              key={master.id}
              className={cn(
                "hover:shadow-xl transition-all duration-200 border-2 bg-white dark:bg-zinc-900",
                currentUserId === master.id
                  ? "border-purple-300 dark:border-purple-700 bg-gradient-to-br from-purple-50 to-white dark:from-purple-900/20 dark:to-zinc-900"
                  : "border-gray-200 dark:border-zinc-800 hover:border-purple-200 dark:hover:border-purple-800"
              )}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div
                      className={cn(
                        "p-3 rounded-xl",
                        currentUserId === master.id
                          ? "bg-purple-200 dark:bg-purple-900/40"
                          : "bg-purple-100 dark:bg-purple-900/20"
                      )}
                    >
                      <Shield className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-lg font-bold text-gray-900 dark:text-gray-100">
                        {master.nome || master.name}
                      </CardTitle>
                      {currentUserId === master.id && (
                        <span className="inline-block px-2 py-0.5 text-xs font-semibold bg-purple-600 text-white rounded-full mt-1">
                          Você
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-zinc-800 p-2 rounded">
                    <Mail className="h-4 w-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
                    <span className="truncate">{master.email}</span>
                  </div>

                  <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-zinc-800 p-2 rounded">
                    <Calendar className="h-4 w-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
                    <span>
                      Desde{" "}
                      {new Date(master.createdAt).toLocaleDateString("pt-BR")}
                    </span>
                  </div>

                  {currentUserId !== master.id ? (
                    <div className="pt-2">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <InteractiveHoverButton className="w-full bg-red-600 hover:bg-red-700 text-white border-red-600">
                            <span className="flex items-center gap-2">
                              <Trash2 className="h-4 w-4" />
                              Excluir Master
                            </span>
                          </InteractiveHoverButton>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle className="flex items-center gap-2">
                              <Trash2 className="h-5 w-5 text-red-600" />
                              Confirmar Exclusão
                            </AlertDialogTitle>
                            <AlertDialogDescription className="space-y-3">
                              <p>
                                Tem certeza que deseja excluir o usuário master:
                              </p>
                              <div className="bg-gray-100 p-3 rounded border-l-4 border-red-500">
                                <p className="font-semibold text-gray-900">
                                  {master.nome || master.name}
                                </p>
                                <p className="text-sm text-gray-600">
                                  {master.email}
                                </p>
                              </div>
                              <p className="text-red-600 font-semibold">
                                ⚠️ Esta ação não pode ser desfeita!
                              </p>
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel asChild>
                              <InteractiveHoverButton className="bg-white hover:bg-gray-50 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-zinc-700">
                                Cancelar
                              </InteractiveHoverButton>
                            </AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() =>
                                handleDelete(master.id, master.email)
                              }
                              asChild
                            >
                              <InteractiveHoverButton className="bg-red-600 hover:bg-red-700 text-white border-red-600">
                                Sim, Excluir Permanentemente
                              </InteractiveHoverButton>
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  ) : (
                    <div className="pt-2">
                      <div className="text-sm text-center py-2.5 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 rounded font-medium">
                        🔒 Sua conta atual
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {masters.length === 0 && (
          <Card className="border-2 border-dashed border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-900">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="p-4 bg-purple-100 dark:bg-purple-900/20 rounded-full mb-4">
                <Shield className="h-12 w-12 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Nenhum usuário master encontrado
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-center mb-6 max-w-md">
                Comece criando seu primeiro usuário master clicando no botão
                &quot;Criar Novo Master&quot; acima
              </p>
              <InteractiveHoverButton
                onClick={() => setDialogOpen(true)}
                className="bg-purple-600 hover:bg-purple-700 text-white border-purple-600"
              >
                <span className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Criar Primeiro Master
                </span>
              </InteractiveHoverButton>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
