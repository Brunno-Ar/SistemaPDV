"use client";

import { InteractiveHoverButton } from "@/components/ui/interactive-hover-button";
import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Store, Mail, Lock, Eye, EyeOff, AlertTriangle } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [inactivityMessage, setInactivityMessage] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Verificar se foi deslogado por inatividade
  useEffect(() => {
    const reason = searchParams?.get("reason");
    if (reason === "inactivity") {
      setInactivityMessage(true);
      // Limpar a mensagem após 10 segundos
      setTimeout(() => setInactivityMessage(false), 10000);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await signIn("credentials", {
        email: email.toLowerCase(),
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Email ou senha inválidos");
      } else {
        // Marcar sessão como ativa
        const currentTime = Date.now().toString();
        sessionStorage.setItem("pdv_tab_session_id", currentTime);
        localStorage.setItem("pdv_browser_session_id", currentTime);

        // Buscar a sessão para obter o role
        const response = await fetch("/api/auth/session");
        const session = await response.json();

        // Redirecionar baseado no role
        if (session?.user?.role === "master") {
          router.push("/master");
        } else if (session?.user?.role === "admin") {
          router.push("/admin");
        } else {
          router.push("/dashboard");
        }
      }
    } catch (error) {
      setError("Erro ao fazer login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col group/design-root overflow-x-hidden font-sans bg-gray-50 dark:bg-zinc-950 text-gray-800 dark:text-gray-100">
      {inactivityMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 w-full max-w-lg z-50 px-4">
          <div className="flex items-start gap-4 rounded-lg border border-[#fde68a] bg-[#fffbeb] p-4 shadow-lg dark:bg-[#2d1a03] dark:border-[#78350f]">
            <div className="text-[#b45309] dark:text-[#fde68a] pt-0.5">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <strong className="block font-medium text-[#b45309] dark:text-[#fde68a]">
                Sua sessão expirou
              </strong>
              <p className="mt-1 text-sm text-[#b45309] dark:text-[#fde68a]">
                Por segurança, você foi desconectado após um período de
                inatividade. Por favor, faça o login novamente.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex h-full min-h-screen grow flex-col">
        <div className="flex flex-1">
          <div className="grid w-full grid-cols-1 md:grid-cols-5">
            <div className="relative hidden md:flex col-span-3 flex-col items-center justify-center bg-[#137fec] p-12 text-white overflow-hidden">
              <div className="absolute inset-0 z-0 bg-gradient-to-br from-[#137fec] to-[#f8b4a0] opacity-90"></div>
              <div className="absolute bottom-0 left-0 w-full h-2/3 bg-[#ffeaa7] rounded-t-[4rem] transform skew-y-[-5deg] origin-bottom-left"></div>
              <div className="absolute bottom-0 right-0 w-3/4 h-1/2 bg-[#f8b4a0] rounded-tl-[6rem] transform skew-y-[5deg] origin-bottom-right opacity-80"></div>
              <div className="absolute bottom-1/4 left-1/4 w-40 h-40 bg-white rounded-full flex items-center justify-center shadow-lg z-10">
                <Store className="text-[#87d3a0] h-24 w-24" />
              </div>
              <div className="absolute top-1/4 right-1/4 w-24 h-24 bg-[#ffeaa7] rounded-full shadow-md z-10"></div>
              <div className="absolute bottom-1/3 left-1/2 w-32 h-32 bg-[#137fec] rounded-full shadow-md z-10"></div>
              <div className="absolute top-1/2 left-1/3 w-20 h-20 bg-[#f8b4a0] rounded-full shadow-md z-10"></div>
              <div className="relative z-10 flex flex-col items-center justify-center text-center max-w-sm">
                <h2 className="text-6xl font-sans font-bold tracking-tight mb-4 drop-shadow-lg">
                  FlowPDV
                </h2>
                <p className="text-2xl font-sans mt-2 opacity-90 drop-shadow-md">
                  Sua loja, com um toque mágico.
                </p>
              </div>
            </div>
            <div className="flex col-span-1 md:col-span-2 flex-col items-center justify-center bg-gray-50 dark:bg-zinc-950 p-6 sm:p-12 relative">
              <div className="absolute top-4 right-4">
                <ThemeToggle />
              </div>
              <div className="w-full max-w-md">
                <div className="flex flex-col items-center justify-center text-center md:hidden mb-10">
                  <Store className="text-6xl mb-2 text-primary dark:text-primary h-16 w-16" />
                  <h2 className="text-4xl font-sans font-bold tracking-tight text-gray-800 dark:text-gray-100">
                    FlowPDV
                  </h2>
                  <p className="text-lg font-sans mt-1 text-gray-600 dark:text-gray-300">
                    Sua loja, com um toque mágico.
                  </p>
                </div>
                <h1 className="text-gray-800 dark:text-gray-100 tracking-light text-[38px] font-sans font-bold leading-tight text-center pb-2">
                  Entre para o FlowPDV!
                </h1>
                <p className="text-gray-600 dark:text-gray-400 text-base font-sans font-normal leading-normal pb-6 text-center">
                  Faça seu login para gerenciar sua loja com magia.
                </p>
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                  <label className="flex flex-col flex-1">
                    <p className="text-gray-800 dark:text-gray-200 text-sm font-sans font-medium leading-normal pb-2">
                      E-mail
                    </p>
                    <div className="relative flex items-center">
                      <Mail className="absolute left-4 text-gray-400 dark:text-gray-500 pointer-events-none h-6 w-6" />
                      <input
                        className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-gray-800 dark:text-gray-100 focus:outline-0 focus:ring-2 focus:ring-blue-500/50 border border-gray-300 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus:border-blue-500 dark:focus:border-blue-500 h-14 placeholder:text-gray-400 dark:placeholder:text-gray-500 pl-12 pr-4 text-base font-sans font-normal leading-normal shadow-sm"
                        placeholder="seuemail@exemplo.com"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                  </label>
                  <label className="flex flex-col flex-1">
                    <div className="flex justify-between items-baseline pb-2">
                      <p className="text-gray-800 dark:text-gray-200 text-sm font-sans font-medium leading-normal">
                        Senha
                      </p>
                      <Link
                        href="#"
                        className="text-blue-600 dark:text-blue-500 hover:underline text-sm font-sans font-normal leading-normal"
                      >
                        Esqueceu sua senha?
                      </Link>
                    </div>
                    <div className="relative flex items-center">
                      <Lock className="absolute left-4 text-gray-400 dark:text-gray-500 pointer-events-none h-6 w-6" />
                      <input
                        className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-gray-800 dark:text-gray-100 focus:outline-0 focus:ring-2 focus:ring-blue-500/50 border border-gray-300 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus:border-blue-500 dark:focus:border-blue-500 h-14 placeholder:text-gray-400 dark:placeholder:text-gray-500 pl-12 pr-12 text-base font-sans font-normal leading-normal shadow-sm"
                        placeholder="••••••••"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                      <button
                        className="absolute right-4 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-6 w-6" />
                        ) : (
                          <Eye className="h-6 w-6" />
                        )}
                      </button>
                    </div>
                  </label>

                  {error && (
                    <div className="text-red-500 text-sm text-center font-medium">
                      {error}
                    </div>
                  )}

                  <div className="pt-4 space-y-4">
                    <InteractiveHoverButton
                      className="w-full bg-cta-bg text-white hover:bg-cta-bg/90 border-cta-bg h-14 text-lg"
                      type="submit"
                      disabled={loading}
                    >
                      {loading ? "Entrando..." : "Entrar"}
                    </InteractiveHoverButton>
                    <div className="text-center">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Não tem uma conta?{" "}
                        <Link
                          href="/signup"
                          className="text-blue-600 dark:text-blue-500 hover:underline font-medium"
                        >
                          Cadastre-se
                        </Link>
                      </p>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
