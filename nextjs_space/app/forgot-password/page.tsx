"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Mail,
  ArrowRight,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sparkles } from "@/components/Sparkles";
import { ThemeToggle } from "@/components/theme-toggle";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.error || "Ocorreu um erro ao tentar recuperar a senha.",
        );
      }

      setSuccess(true);
    } catch (error: any) {
      setError(
        error.message ||
          "Ocorreu um erro ao tentar recuperar a senha. Tente novamente.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-white dark:bg-black text-gray-900 dark:text-white overflow-hidden relative">
      {/* Background */}
      <div className="absolute inset-0 z-0">
        <Sparkles />
      </div>

      <div className="absolute top-8 right-8 z-50">
        <ThemeToggle />
      </div>

      <div className="w-full h-full flex items-center justify-center relative z-10 p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-gray-200 dark:border-zinc-800 rounded-2xl p-8 shadow-2xl"
        >
          <div className="mb-8">
            <Link
              href="/login"
              className="inline-flex items-center text-sm text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 mb-6 transition-colors"
            >
              <ArrowLeft size={16} className="mr-2" />
              Voltar para o login
            </Link>
            <h1 className="text-3xl font-bold tracking-tight mb-2">
              Recuperar senha
            </h1>
            <p className="text-gray-500 dark:text-gray-400">
              Digite seu email para receber as instruções de recuperação.
            </p>
          </div>

          {success ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-8"
            >
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4 text-green-600">
                <CheckCircle2 size={32} />
              </div>
              <h3 className="text-xl font-bold mb-2">Email enviado!</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6">
                Verifique sua caixa de entrada para redefinir sua senha.
              </p>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setSuccess(false)}
              >
                Enviar novamente
              </Button>
            </motion.div>
          ) : (
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
                    className="w-full bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl px-12 py-4 outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all placeholder:text-gray-400"
                    placeholder="seu@email.com"
                    required
                  />
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
                    Enviar instruções
                    <ArrowRight size={20} />
                  </>
                )}
              </Button>
            </form>
          )}
        </motion.div>
      </div>
    </div>
  );
}
