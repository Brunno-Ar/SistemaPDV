"use client";

import { InteractiveHoverButton } from "@/components/ui/interactive-hover-button";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Building2, User, Mail, Lock, Eye, EyeOff, Store } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [nome, setNome] = useState("");
  const [nomeEmpresa, setNomeEmpresa] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    if (password !== confirmPassword) {
      setError("As senhas não coincidem");
      setLoading(false);
      return;
    }

    try {
      const signupResponse = await fetch("/api/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.toLowerCase(),
          password,
          nome,
          nomeEmpresa,
        }),
      });

      const signupData = await signupResponse.json();

      if (!signupResponse.ok) {
        setError(signupData.error || "Erro ao criar conta");
        return;
      }

      // Mostrar mensagem de sucesso
      setSuccess(signupData.message);

      // Limpar formulário
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setNome("");
      setNomeEmpresa("");

      // Redirecionar para login após 3 segundos
      setTimeout(() => {
        router.push("/login");
      }, 3000);
    } catch (error) {
      setError("Erro ao criar conta");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen w-full group/design-root overflow-hidden font-sans bg-gray-50 dark:bg-zinc-950 text-gray-900 dark:text-gray-100">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#137fec]/10 to-[#137fec]/20 items-center justify-center p-8 relative">
        <div className="absolute inset-0 bg-grid-pattern bg-repeat opacity-5 dark:opacity-10"></div>
        <div className="relative z-10 flex flex-col items-center justify-center text-center">
          <Store className="h-48 w-48 text-[#137fec]/70 dark:text-[#137fec]/50 mb-8" />
          <h1 className="text-4xl font-bold text-[#137fec] dark:text-[#137fec] mb-4">
            FlowPDV
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-md">
            Simplifique a gestão do seu negócio com nossa plataforma completa.
          </p>
        </div>
      </div>

      <div className="flex flex-1 justify-center py-8 px-4 sm:py-12 md:py-16 lg:w-1/2 lg:overflow-y-auto relative">
        <div className="absolute top-4 right-4 z-10">
          <ThemeToggle />
        </div>
        <div className="layout-content-container flex flex-col w-full max-w-[960px] flex-1 lg:max-w-xl">
          <header className="flex items-center justify-center whitespace-nowrap px-4 py-3 sm:px-10 lg:hidden">
            <div className="flex items-center gap-4 text-gray-900 dark:text-gray-100">
              <Store className="text-[#137fec] h-8 w-8" />
              <h2 className="text-gray-900 dark:text-gray-100 text-xl font-bold leading-tight tracking-[-0.015em]">
                FlowPDV
              </h2>
            </div>
          </header>

          <main className="flex-1 w-full max-w-2xl mx-auto lg:max-w-xl">
            <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-lg border border-gray-200 dark:border-zinc-800 p-6 sm:p-8 md:p-10">
              <div className="flex flex-wrap justify-between gap-3 mb-2">
                <p className="font-sans text-gray-900 dark:text-gray-100 text-3xl sm:text-4xl font-bold leading-tight tracking-[-0.033em] min-w-72">
                  Desbloqueie o Potencial da sua Loja.
                </p>
              </div>
              <p className="text-gray-500 dark:text-gray-400 text-lg font-normal leading-normal pb-6 pt-1">
                Cadastro Rápido e Descomplicado!
              </p>

              <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                <div className="border-t border-gray-200 dark:border-zinc-800 pt-6">
                  <h3 className="text-gray-900 dark:text-gray-100 text-lg font-bold leading-tight tracking-[-0.015em] pb-2">
                    Dados da Empresa
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
                    <label className="flex flex-col min-w-40 flex-1 sm:col-span-2">
                      <p className="text-gray-900 dark:text-gray-100 text-base font-medium leading-normal pb-2">
                        Nome da Empresa
                      </p>
                      <div className="relative">
                        <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                        <input
                          className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-gray-900 dark:text-gray-100 focus:outline-0 focus:ring-2 focus:ring-blue-500/50 border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950 h-12 placeholder:text-gray-500 dark:placeholder:text-gray-400 pl-10 pr-4 text-base font-normal leading-normal"
                          placeholder="Digite o nome da sua empresa"
                          value={nomeEmpresa}
                          onChange={(e) => setNomeEmpresa(e.target.value)}
                          required
                        />
                      </div>
                    </label>
                  </div>
                </div>
                <div className="border-t border-gray-200 dark:border-zinc-800 pt-6">
                  <h3 className="text-gray-900 dark:text-gray-100 text-lg font-bold leading-tight tracking-[-0.015em] pb-2">
                    Usuário Administrador
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
                    <label className="flex flex-col min-w-40 flex-1 sm:col-span-2">
                      <p className="text-gray-900 dark:text-gray-100 text-base font-medium leading-normal pb-2">
                        Nome Completo
                      </p>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                        <input
                          className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-gray-900 dark:text-gray-100 focus:outline-0 focus:ring-2 focus:ring-blue-500/50 border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950 h-12 placeholder:text-gray-500 dark:placeholder:text-gray-400 pl-10 pr-4 text-base font-normal leading-normal"
                          placeholder="Digite seu nome completo"
                          value={nome}
                          onChange={(e) => setNome(e.target.value)}
                          required
                        />
                      </div>
                    </label>
                    <label className="flex flex-col min-w-40 flex-1 sm:col-span-2">
                      <p className="text-gray-900 dark:text-gray-100 text-base font-medium leading-normal pb-2">
                        E-mail
                      </p>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                        <input
                          className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-gray-900 dark:text-gray-100 focus:outline-0 focus:ring-2 focus:ring-blue-500/50 border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950 h-12 placeholder:text-gray-500 dark:placeholder:text-gray-400 pl-10 pr-4 text-base font-normal leading-normal"
                          placeholder="seuemail@exemplo.com"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                        />
                      </div>
                    </label>
                    <label className="flex flex-col min-w-40 flex-1 relative">
                      <p className="text-gray-900 dark:text-gray-100 text-base font-medium leading-normal pb-2">
                        Senha
                      </p>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                        <input
                          className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-gray-900 dark:text-gray-100 focus:outline-0 focus:ring-2 focus:ring-blue-500/50 border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950 h-12 placeholder:text-gray-500 dark:placeholder:text-gray-400 pl-10 pr-12 text-base font-normal leading-normal"
                          placeholder="Crie uma senha forte"
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          minLength={8}
                        />
                        <button
                          aria-label="Mostrar senha"
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400"
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="h-5 w-5" />
                          ) : (
                            <Eye className="h-5 w-5" />
                          )}
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Mínimo 8 caracteres.
                      </p>
                    </label>
                    <label className="flex flex-col min-w-40 flex-1">
                      <p className="text-gray-900 dark:text-gray-100 text-base font-medium leading-normal pb-2">
                        Confirmar Senha
                      </p>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                        <input
                          className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-gray-900 dark:text-gray-100 focus:outline-0 focus:ring-2 focus:ring-blue-500/50 border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950 h-12 placeholder:text-gray-500 dark:placeholder:text-gray-400 pl-10 pr-4 text-base font-normal leading-normal"
                          placeholder="Repita sua senha"
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required
                        />
                      </div>
                    </label>
                  </div>
                </div>
                <div className="flex items-start pt-4">
                  <input
                    className="form-checkbox h-5 w-5 rounded border-gray-200 dark:border-zinc-800 text-blue-600 focus:ring-blue-500/50 bg-gray-50 dark:bg-zinc-950 mt-0.5"
                    id="terms"
                    type="checkbox"
                    required
                  />
                  <label className="ml-3 text-sm" htmlFor="terms">
                    <span className="text-gray-900 dark:text-gray-100">
                      Eu li e aceito os
                    </span>{" "}
                    <Link
                      className="font-medium text-blue-600 dark:text-blue-500 hover:underline"
                      href="#"
                    >
                      Termos de Serviço
                    </Link>
                    <span className="text-gray-900 dark:text-gray-100">
                      {" "}
                      e a{" "}
                    </span>
                    <Link
                      className="font-medium text-blue-600 dark:text-blue-500 hover:underline"
                      href="#"
                    >
                      Política de Privacidade
                    </Link>
                    .
                  </label>
                </div>
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm text-center">
                    {error}
                  </div>
                )}
                {success && (
                  <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded text-sm text-center">
                    {success}
                    <p className="mt-2 text-xs">
                      Redirecionando para o login...
                    </p>
                  </div>
                )}

                <InteractiveHoverButton
                  className="w-full bg-cta-bg text-white hover:bg-cta-bg/90 border-cta-bg h-12 text-base font-bold mt-4"
                  type="submit"
                  disabled={loading}
                >
                  {loading ? "Criando..." : "Finalizar Cadastro"}
                </InteractiveHoverButton>
              </form>
              <p className="text-center text-gray-500 dark:text-gray-400 text-sm mt-8">
                Já tem uma conta?{" "}
                <Link
                  className="font-medium text-blue-600 dark:text-blue-500 hover:underline"
                  href="/login"
                >
                  Faça login
                </Link>
              </p>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
