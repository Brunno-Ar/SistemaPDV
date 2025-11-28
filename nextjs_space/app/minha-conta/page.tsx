"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { NavBar } from "@/components/nav-bar";
import { Key } from "lucide-react";

export default function MinhaContaPage() {
  const [formData, setFormData] = useState({
    senhaAtual: "",
    novaSenha: "",
    confirmarNovaSenha: "",
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (formData.novaSenha !== formData.confirmarNovaSenha) {
      toast({
        title: "Erro",
        description: "A nova senha e a confirmação não coincidem",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    if (formData.novaSenha.length < 6) {
      toast({
        title: "Erro",
        description: "A nova senha deve ter pelo menos 6 caracteres",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          senhaAtual: formData.senhaAtual,
          novaSenha: formData.novaSenha,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao alterar senha");
      }

      toast({
        title: "Sucesso",
        description: "Senha alterada com sucesso!",
      });

      setFormData({
        senhaAtual: "",
        novaSenha: "",
        confirmarNovaSenha: "",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description:
          error instanceof Error ? error.message : "Erro ao alterar senha",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <div className="max-w-md mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Key className="h-5 w-5 text-blue-600" />
              <CardTitle>Alterar Senha</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="senhaAtual">Senha Atual</Label>
                <Input
                  id="senhaAtual"
                  type="password"
                  value={formData.senhaAtual}
                  onChange={(e) =>
                    setFormData({ ...formData, senhaAtual: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="novaSenha">Nova Senha</Label>
                <Input
                  id="novaSenha"
                  type="password"
                  value={formData.novaSenha}
                  onChange={(e) =>
                    setFormData({ ...formData, novaSenha: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmarNovaSenha">Confirmar Nova Senha</Label>
                <Input
                  id="confirmarNovaSenha"
                  type="password"
                  value={formData.confirmarNovaSenha}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      confirmarNovaSenha: e.target.value,
                    })
                  }
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Alterando..." : "Alterar Senha"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
