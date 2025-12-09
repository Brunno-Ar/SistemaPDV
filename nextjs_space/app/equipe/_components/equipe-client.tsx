"use client";

import { InteractiveHoverButton } from "@/components/ui/interactive-hover-button";
import { useSession } from "next-auth/react";

import { AnimatedLoadingSkeleton } from "@/components/ui/loading";
import { UserCard } from "@/components/shared/user-card";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Users, Mail, Calendar } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Usuario {
  id: string;
  email: string;
  nome: string | null;
  name: string | null;
  role: string;
  createdAt: string;
}

interface EquipeClientProps {
  companyId?: string; // Opcional: usado pelo Master
}

export default function EquipeClient({ companyId }: EquipeClientProps = {}) {
  const { data: session } = useSession();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    senha: "",
    nome: "",
    role: "caixa", // Default role
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchUsuarios = useCallback(async () => {
    try {
      // 🔥 Incluir companyId se fornecido
      const url = companyId
        ? `/api/admin/equipe?companyId=${companyId}&t=${Date.now()}`
        : `/api/admin/equipe?t=${Date.now()}`;

      const response = await fetch(url);
      if (!response.ok) throw new Error("Erro ao buscar usuários");
      const data = await response.json();

      // Ensure data is an array
      if (Array.isArray(data)) {
        setUsuarios(data);
      } else {
        setUsuarios([]);
      }
    } catch (error) {
      console.error("Erro ao buscar usuários:", error);
      setUsuarios([]);
      toast({
        title: "Erro",
        description:
          error instanceof Error
            ? error.message
            : "Não foi possível carregar a equipe",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    fetchUsuarios();
  }, [fetchUsuarios]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // 🔥 Incluir companyId se fornecido
      let url = "/api/admin/equipe";
      if (companyId) {
        url += `?companyId=${companyId}`;
      }

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao criar usuário");
      }

      toast({
        title: "Sucesso!",
        description: `Usuário ${formData.role} criado com sucesso`,
      });

      // ✅ Fecha o dialog usando o handler que reseta o form
      handleDialogChange(false);

      // ✅ Re-fetch após fechar
      fetchUsuarios();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Erro desconhecido";
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-10">
        <AnimatedLoadingSkeleton />
      </div>
    );
  }

  const handleDialogChange = (open: boolean) => {
    setDialogOpen(open);
    // Reset form quando o dialog é fechado
    if (!open) {
      setFormData({
        email: "",
        senha: "",
        nome: "",
        role: "caixa",
      });
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
            Gerenciar Equipe
          </h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
            Adicione e gerencie os usuários da sua empresa
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={handleDialogChange}>
          <DialogTrigger asChild>
            <InteractiveHoverButton className="bg-cta-bg hover:bg-cta-bg/90 text-white border-cta-bg w-full sm:w-auto">
              <span className="flex items-center justify-center gap-2">
                <Plus className="h-4 w-4" />
                Novo Usuário
              </span>
            </InteractiveHoverButton>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[450px]">
            <DialogHeader>
              <DialogTitle>Criar Novo Usuário</DialogTitle>
              <DialogDescription>
                Preencha os dados do novo membro da equipe
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
                  placeholder="Nome do usuário"
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
                  placeholder="usuario@email.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Função *</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) =>
                    setFormData({ ...formData, role: value })
                  }
                >
                  <SelectTrigger id="role">
                    <SelectValue placeholder="Selecione a função" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="caixa">Caixa (Operacional)</SelectItem>
                    <SelectItem value="gerente">Gerente (Gestão)</SelectItem>
                  </SelectContent>
                </Select>
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
                  placeholder="Senha do usuário"
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
                  className="bg-cta-bg hover:bg-cta-bg/90 text-white border-cta-bg"
                >
                  {submitting ? "Criando..." : "Criar Usuário"}
                </InteractiveHoverButton>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {usuarios.map((usuario) => {
          const isCurrentUser = usuario.id === session?.user?.id;
          const displayName =
            usuario.nome || usuario.name || usuario.email.split("@")[0];

          return (
            <div key={usuario.id} className={!isCurrentUser ? "contents" : ""}>
              {isCurrentUser ? (
                <UserCard
                  id={usuario.id}
                  name={displayName}
                  email={usuario.email}
                  createdAt={usuario.createdAt}
                  role={usuario.role}
                  isCurrentUser={true}
                />
              ) : (
                <Link href={`/equipe/${usuario.id}`} className="block h-full">
                  <UserCard
                    id={usuario.id}
                    name={displayName}
                    email={usuario.email}
                    createdAt={usuario.createdAt}
                    role={usuario.role}
                    isCurrentUser={false}
                    className="hover:shadow-md cursor-pointer"
                  />
                </Link>
              )}
            </div>
          );
        })}
      </div>

      {usuarios.length === 0 && (
        <Card className="bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              Nenhum usuário cadastrado
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-center mb-4">
              Comece adicionando um novo usuário caixa
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
