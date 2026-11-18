"use client";

import { ThemeToggle } from "@/components/theme-toggle";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Loader2, Lock, Building2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { RestartTourButton } from "@/components/restart-tour-button";

export default function ConfiguracoesPage() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  const { data: session } = useSession();

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
        <div className="flex flex-col gap-6">
          <InstallPrompt variant="inline" />

          {/* Tutoriais Section */}
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
              Tutoriais e Guias
            </h2>
            <div className="flex flex-col space-y-2">
              <span className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                Esqueceu como as funções principais do sistema funcionam?
                Reinicie o seu tour de boas-vindas interativo a qualquer
                momento.
              </span>
              <RestartTourButton />
            </div>
          </div>
        </div>

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
        {session?.user?.role === "admin" && (
          <CompanySettingsSection />
        )}
      </div>
    </div>
  );
}

interface Endereco {
  cep: string;
  logradouro: string;
  numero: string;
  bairro: string;
  cidade: string;
  uf: string;
}

interface EmpresaData {
  id: string;
  nome: string;
  cpfCnpj: string | null;
  telefone: string | null;
  endereco: Endereco | null;
}

function CompanySettingsSection() {
  const [empresa, setEmpresa] = useState<EmpresaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    cpfCnpj: "",
    telefone: "",
    enderecoCep: "",
    enderecoLogradouro: "",
    enderecoNumero: "",
    enderecoBairro: "",
    enderecoCidade: "",
    enderecoUf: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/admin/empresa");
        if (!res.ok) {
          if (res.status === 404) {
            setEmpresa(null);
            return;
          }
          throw new Error("Não foi possível carregar os dados da empresa");
        }
        const json = await res.json();
        if (!cancelled) {
          setEmpresa(json.empresa);
          setForm({
            cpfCnpj: json.empresa.cpfCnpj || "",
            telefone: json.empresa.telefone || "",
            enderecoCep: json.empresa.endereco?.cep || "",
            enderecoLogradouro: json.empresa.endereco?.logradouro || "",
            enderecoNumero: json.empresa.endereco?.numero || "",
            enderecoBairro: json.empresa.endereco?.bairro || "",
            enderecoCidade: json.empresa.endereco?.cidade || "",
            enderecoUf: json.empresa.endereco?.uf || "",
          });
        }
      } catch {
        if (!cancelled) setEmpresa(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const onlyDigits = (value: string) => value.replace(/\D/g, "");

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    const { cpfCnpj, telefone, enderecoCep, enderecoUf } = form;

    const digitsCpf = onlyDigits(cpfCnpj);
    if (cpfCnpj && digitsCpf.length !== 11 && digitsCpf.length !== 14) {
      next.cpfCnpj = "CPF deve ter 11 dígitos ou CNPJ 14 dígitos";
    }

    const digitsTel = onlyDigits(telefone);
    if (telefone && digitsTel.length < 10 && digitsTel.length > 11) {
      next.telefone = "Telefone deve ter 10 ou 11 dígitos";
    }

    if (enderecoCep && onlyDigits(enderecoCep).length !== 8) {
      next.enderecoCep = "CEP deve ter 8 dígitos";
    }

    if (enderecoUf && enderecoUf.length !== 2) {
      next.enderecoUf = "UF deve ter 2 letras";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
    setSaved(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/admin/empresa", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cpfCnpj: onlyDigits(form.cpfCnpj) || undefined,
          telefone: onlyDigits(form.telefone) || undefined,
          enderecoLogradouro: form.enderecoLogradouro || undefined,
          enderecoNumero: form.enderecoNumero || undefined,
          enderecoBairro: form.enderecoBairro || undefined,
          enderecoCidade: form.enderecoCidade || undefined,
          enderecoUf: form.enderecoUf || undefined,
          enderecoCep: onlyDigits(form.enderecoCep) || undefined,
        }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Erro ao salvar os dados da empresa");
      }

      const json = await res.json();
      setEmpresa(json.empresa);
      setSaved(true);
      toast({
        title: "Salvo",
        description: "Dados da empresa atualizados com sucesso",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description:
          error instanceof Error ? error.message : "Erro ao salvar a empresa",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 p-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-6 text-gray-900 dark:text-white flex items-center gap-2">
          <Building2 className="w-5 h-5 text-blue-600" />
          Dados da Empresa
        </h2>
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  const empresaVazia = empresa
    ? !empresa.cpfCnpj &&
      !empresa.telefone &&
      !empresa.endereco?.cep &&
      !empresa.endereco?.logradouro
    : true;

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 p-6 shadow-sm">
      <h2 className="text-lg font-semibold mb-6 text-gray-900 dark:text-white flex items-center gap-2">
        <Building2 className="w-5 h-5 text-blue-600" />
        Dados da Empresa
      </h2>

      {empresa && !empresaVazia ? (
        <>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Preenchido. Edite abaixo para atualizar o cadastro da empresa.
          </p>
          <form onSubmit={handleSave} className="space-y-3">
            {empresaFields(form, errors, handleChange)}
            <Button
              type="submit"
              disabled={saving}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Atualizar Dados"
              )}
            </Button>
          </form>
          {saved && (
            <p className="text-xs text-green-600 dark:text-green-400 mt-2">
              Dados atualizados com sucesso.
            </p>
          )}
        </>
      ) : (
        <>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Ainda não há dados cadastrais desta empresa. Preencha abaixo.
          </p>
          <form onSubmit={handleSave} className="space-y-3">
            {empresaFields(form, errors, handleChange)}
            <Button
              type="submit"
              disabled={saving}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Salvar Dados"
              )}
            </Button>
          </form>
        </>
      )}
    </div>
  );
}

function empresaFields(
  form: {
    cpfCnpj: string;
    telefone: string;
    enderecoCep: string;
    enderecoLogradouro: string;
    enderecoNumero: string;
    enderecoBairro: string;
    enderecoCidade: string;
    enderecoUf: string;
  },
  errors: Record<string, string>,
  handleChange: (field: string, value: string) => void
) {
  return (
    <>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="cpfCnpj">CPF / CNPJ</Label>
          <Input
            id="cpfCnpj"
            value={form.cpfCnpj}
            onChange={(e) => handleChange("cpfCnpj", e.target.value)}
            placeholder="000.000.000-00 ou 00.000.000/0000-00"
            error={Boolean(errors.cpfCnpj)}
          />
          {errors.cpfCnpj && (
            <p className="text-xs text-red-500 dark:text-red-400">
              {errors.cpfCnpj}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="telefone">Telefone / Contato</Label>
          <Input
            id="telefone"
            value={form.telefone}
            onChange={(e) => handleChange("telefone", e.target.value)}
            placeholder="(11) 90000-0000"
            error={Boolean(errors.telefone)}
          />
          {errors.telefone && (
            <p className="text-xs text-red-500 dark:text-red-400">
              {errors.telefone}
            </p>
          )}
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="enderecoLogradouro">Logradouro</Label>
          <Input
            id="enderecoLogradouro"
            value={form.enderecoLogradouro}
            onChange={(e) =>
              handleChange("enderecoLogradouro", e.target.value)
            }
            placeholder="Av. Paulista, 1000"
            error={Boolean(errors.enderecoLogradouro)}
          />
          {errors.enderecoLogradouro && (
            <p className="text-xs text-red-500 dark:text-red-400">
              {errors.enderecoLogradouro}
            </p>
          )}
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="enderecoCep">CEP</Label>
          <Input
            id="enderecoCep"
            value={form.enderecoCep}
            onChange={(e) => handleChange("enderecoCep", e.target.value)}
            placeholder="01234-567"
            error={Boolean(errors.enderecoCep)}
            maxLength={9}
          />
          {errors.enderecoCep && (
            <p className="text-xs text-red-500 dark:text-red-400">
              {errors.enderecoCep}
            </p>
          )}
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="enderecoBairro">Bairro</Label>
          <Input
            id="enderecoBairro"
            value={form.enderecoBairro}
            onChange={(e) => handleChange("enderecoBairro", e.target.value)}
            placeholder="Bela Vista"
            error={Boolean(errors.enderecoBairro)}
          />
          {errors.enderecoBairro && (
            <p className="text-xs text-red-500 dark:text-red-400">
              {errors.enderecoBairro}
            </p>
          )}
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="enderecoCidade">Cidade</Label>
          <Input
            id="enderecoCidade"
            value={form.enderecoCidade}
            onChange={(e) => handleChange("enderecoCidade", e.target.value)}
            placeholder="São Paulo"
            error={Boolean(errors.enderecoCidade)}
          />
          {errors.enderecoCidade && (
            <p className="text-xs text-red-500 dark:text-red-400">
              {errors.enderecoCidade}
            </p>
          )}
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="enderecoUf">UF</Label>
          <Input
            id="enderecoUf"
            value={form.enderecoUf}
            onChange={(e) => handleChange("enderecoUf", e.target.value)}
            placeholder="SP"
            maxLength={2}
            error={Boolean(errors.enderecoUf)}
          />
          {errors.enderecoUf && (
            <p className="text-xs text-red-500 dark:text-red-400">
              {errors.enderecoUf}
            </p>
          )}
        </div>
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="enderecoNumero">Número</Label>
        <Input
          id="enderecoNumero"
          value={form.enderecoNumero}
          onChange={(e) => handleChange("enderecoNumero", e.target.value)}
          placeholder="S/N"
          error={Boolean(errors.enderecoNumero)}
        />
        {errors.enderecoNumero && (
          <p className="text-xs text-red-500 dark:text-red-400">
            {errors.enderecoNumero}
          </p>
        )}
      </div>
    </>
  );
}
