"use client";

import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertTriangle,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Sparkles } from "@/components/Sparkles";
import { AuthLayout } from "@/components/auth/auth-layout";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const reason = searchParams?.get("reason");
    if (reason === "inactivity") {
      setError("Sua sessão expirou por inatividade.");
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
        if (result.error === "CredentialsSignin") {
          setError("Email ou senha inválidos");
        } else if (result.error.includes("aguardando aprovação")) {
          // Redirecionar para página de bloqueio - empresa pendente
          router.push(
            `/bloqueado?reason=pendente&email=${encodeURIComponent(email)}`
          );
        } else if (
          result.error.includes("Acesso suspenso") ||
          result.error.includes("Pagamento não identificado")
        ) {
          // Redirecionar para página de bloqueio - empresa pausada
          router.push(
            `/bloqueado?reason=pausado&email=${encodeURIComponent(email)}`
          );
        } else if (
          result.error.includes("Acesso bloqueado") ||
          result.error.includes("mensalidade")
        ) {
          // Redirecionar para página de bloqueio - mensalidade vencida
          router.push(
            `/bloqueado?reason=vencido&email=${encodeURIComponent(email)}`
          );
        } else {
          setError(result.error);
        }
      } else {
        const currentTime = Date.now().toString();
        sessionStorage.setItem("pdv_tab_session_id", currentTime);
        localStorage.setItem("pdv_browser_session_id", currentTime);

        const response = await fetch("/api/auth/session");
        const session = await response.json();

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
    <AuthLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm"
      >
        <div className="mb-10">
          <h1 className="text-4xl font-bold tracking-tight mb-3">
            Bem-vindo de volta!
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-lg">
            Digite suas credenciais para acessar o painel.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl px-12 py-4 outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all placeholder:text-gray-400"
                placeholder="seu@email.com"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Senha
              </label>
              <Link
                href="/forgot-password"
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Esqueceu a senha?
              </Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl px-12 py-4 outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all placeholder:text-gray-400"
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="flex items-center gap-2 text-red-600 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg text-sm font-medium"
            >
              <AlertTriangle size={16} />
              {error}
            </motion.div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-14 text-lg font-bold rounded-xl flex items-center justify-center gap-2"
          >
            {loading ? (
              <Loader2 className="animate-spin w-5 h-5" />
            ) : (
              <>
                Entrar
                <ArrowRight size={20} />
              </>
            )}
          </Button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-gray-500 dark:text-gray-400">
            Não tem uma conta?{" "}
            <Link
              href="/signup"
              className="text-blue-600 font-bold hover:underline"
            >
              Criar conta grátis
            </Link>
          </p>
        </div>
      </motion.div>
    </AuthLayout>
  );
}
