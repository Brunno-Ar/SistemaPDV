"use client";

import { InteractiveHoverButton } from "@/components/ui/interactive-hover-button";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
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
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    senha: "",
    nome: "",
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchUsuarios();
  }, [companyId]); // Re-fetch quando companyId mudar

  const fetchUsuarios = async () => {
    try {
      // 🔥 Incluir companyId se fornecido
      const url = companyId
        ? `/api/admin/equipe?companyId=${companyId}`
        : "/api/admin/equipe";

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
  };

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
        description: "Usuário caixa criado com sucesso",
      });

      // ✅ Fecha o dialog usando o handler que reseta o form
      handleDialogChange(false);

      // ✅ Re-fetch após fechar
      fetchUsuarios();
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-600">Carregando equipe...</div>
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
      });
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gerenciar Equipe</h1>
          <p className="text-gray-600 mt-1">
            Adicione e gerencie os usuários da sua empresa
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={handleDialogChange}>
          <DialogTrigger asChild>
            <InteractiveHoverButton className="bg-blue-600 hover:bg-blue-700 text-white border-blue-600">
              <span className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Novo Usuário Caixa
              </span>
            </InteractiveHoverButton>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[450px]">
            <DialogHeader>
              <DialogTitle>Criar Novo Usuário Caixa</DialogTitle>
              <DialogDescription>
                Preencha os dados do novo operador de caixa
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
                  placeholder="Nome do operador"
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
                  className="bg-white hover:bg-gray-50 text-gray-700 border-gray-200"
                  onClick={() => handleDialogChange(false)}
                  disabled={submitting}
                >
                  Cancelar
                </InteractiveHoverButton>
                <InteractiveHoverButton
                  type="submit"
                  disabled={submitting}
                  className="bg-blue-600 hover:bg-blue-700 text-white border-blue-600"
                >
                  {submitting ? "Criando..." : "Criar Usuário"}
                </InteractiveHoverButton>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {usuarios.map((usuario) => (
          <Card key={usuario.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">
                    {usuario.nome ||
                      usuario.name ||
                      usuario.email.split("@")[0]}
                  </CardTitle>
                  <CardDescription className="flex items-center space-x-1 mt-1">
                    <span
                      className={`inline-block px-2 py-1 text-xs rounded ${
                        usuario.role === "admin"
                          ? "bg-purple-100 text-purple-700"
                          : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {usuario.role === "admin" ? "Admin" : "Caixa"}
                    </span>
                  </CardDescription>
                </div>
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Mail className="h-4 w-4" />
                  <span className="truncate">{usuario.email}</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Calendar className="h-4 w-4" />
                  <span>
                    Desde{" "}
                    {new Date(usuario.createdAt).toLocaleDateString("pt-BR")}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {usuarios.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nenhum usuário cadastrado
            </h3>
            <p className="text-gray-600 text-center mb-4">
              Comece adicionando um novo usuário caixa
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
