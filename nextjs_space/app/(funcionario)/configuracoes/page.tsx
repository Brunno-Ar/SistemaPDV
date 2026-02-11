"use client";

import { ThemeToggle } from "@/components/theme-toggle";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Loader2, Lock, ShieldCheck } from "lucide-react";
import { useSession } from "next-auth/react";
import { InstallPrompt } from "@/components/pwa/install-prompt";

export default function ConfiguracoesPage() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  const { data: session } = useSession();
  const isAdmin =
    session?.user?.role === "admin" || session?.user?.role === "master";

  const [passwords, setPasswords] = useState({
    current: "",
    new: "",
    confirm: "",
  });
  const [authPassword, setAuthPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingAuth, setLoadingAuth] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passwords.new !== passwords.confirm) {
      toast({
        title: "Erro",
        description: "As novas senhas não coincidem",
        variant: "destructive",
      });
      return;
    }

    if (passwords.new.length < 6) {
      toast({
        title: "Erro",
        description: "A nova senha deve ter pelo menos 6 caracteres",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/users/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: passwords.current,
          newPassword: passwords.new,
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      toast({
        title: "Sucesso",
        description: "Sua senha foi alterada com sucesso",
      });

      setPasswords({ current: "", new: "", confirm: "" });
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

  const handleSaveAuthPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (authPassword.length < 4) {
      toast({
        title: "Erro",
        description: "A senha de autorização deve ter pelo menos 4 caracteres",
        variant: "destructive",
      });
      return;
    }

    setLoadingAuth(true);

    try {
      const res = await fetch("/api/admin/config/auth-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: authPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      toast({
        title: "Sucesso",
        description: "Senha de autorização atualizada com sucesso",
      });

      setAuthPassword("");
    } catch (error) {
      toast({
        title: "Erro",
        description:
          error instanceof Error
            ? error.message
            : "Erro ao salvar senha de autorização",
        variant: "destructive",
      });
    } finally {
      setLoadingAuth(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="flex flex-col gap-6 p-6 max-w-4xl mx-auto w-full">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
        Configurações
      </h1>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Appearance Section */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 p-6 shadow-sm h-fit">
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
            Aparência
          </h2>

          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Tema do Sistema
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Tema atual: {resolvedTheme === "dark" ? "Escuro" : "Claro"}
              </span>
            </div>

            <ThemeToggle />
          </div>
        </div>

        {/* PWA / App Section */}
        <InstallPrompt variant="inline" />

        {/* Security Section */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-6 text-gray-900 dark:text-white flex items-center gap-2">
            <Lock className="w-5 h-5 text-blue-600" />
            Segurança
          </h2>

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current">Senha Atual</Label>
              <Input
                id="current"
                type="password"
                value={passwords.current}
                onChange={(e) =>
                  setPasswords({ ...passwords, current: e.target.value })
                }
                placeholder="Digite sua senha atual"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new">Nova Senha</Label>
              <Input
                id="new"
                type="password"
                value={passwords.new}
                onChange={(e) =>
                  setPasswords({ ...passwords, new: e.target.value })
                }
                placeholder="Mínimo 6 caracteres"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm">Confirmar Nova Senha</Label>
              <Input
                id="confirm"
                type="password"
                value={passwords.confirm}
                onChange={(e) =>
                  setPasswords({ ...passwords, confirm: e.target.value })
                }
                placeholder="Confirme a nova senha"
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Atualizando...
                </>
              ) : (
                "Alterar Senha"
              )}
            </Button>
          </form>
        </div>

        {/* Company Settings Section (Admin Only) */}
        {isAdmin && (
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-6 text-gray-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-red-600" />
              Configurações da Empresa
            </h2>

            <form onSubmit={handleSaveAuthPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="authPassword">
                  Senha de Autorização (Gerente)
                </Label>
                <Input
                  id="authPassword"
                  type="password"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="Defina uma senha única"
                  required
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Esta senha será solicitada para autorizar operações sensíveis,
                  como fechamento de caixa com divergência.
                </p>
              </div>

              <Button
                type="submit"
                className="w-full bg-red-600 hover:bg-red-700 text-white"
                disabled={loadingAuth}
              >
                {loadingAuth ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  "Salvar Senha de Autorização"
                )}
              </Button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
