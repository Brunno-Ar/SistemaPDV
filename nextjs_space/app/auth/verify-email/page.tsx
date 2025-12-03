"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { CheckCircle2, XCircle, Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Sparkles } from "@/components/Sparkles";

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Token de verificação não encontrado.");
      return;
    }

    const verifyEmail = async () => {
      try {
        const res = await fetch(`/api/auth/verify-email?token=${token}`);
        const data = await res.json();

        if (res.ok) {
          setStatus("success");
          setMessage("Seu email foi verificado com sucesso!");
        } else {
          setStatus("error");
          setMessage(data.error || "Erro ao verificar email.");
        }
      } catch (error) {
        console.error(error);
        setStatus("error");
        setMessage("Ocorreu um erro inesperado.");
      }
    };

    verifyEmail();
  }, [token]);

  return (
    <div className="min-h-screen w-full flex bg-white dark:bg-black text-gray-900 dark:text-white overflow-hidden relative">
      <div className="absolute inset-0 z-0">
        <Sparkles />
      </div>

      <div className="w-full h-full flex items-center justify-center relative z-10 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-gray-200 dark:border-zinc-800 rounded-2xl p-8 shadow-2xl text-center"
        >
          {status === "loading" && (
            <div className="flex flex-col items-center">
              <Loader2 className="w-16 h-16 text-blue-600 animate-spin mb-4" />
              <h2 className="text-2xl font-bold mb-2">Verificando...</h2>
              <p className="text-gray-500 dark:text-gray-400">
                Aguarde enquanto verificamos seu email.
              </p>
            </div>
          )}

          {status === "success" && (
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4 text-green-600">
                <CheckCircle2 size={32} />
              </div>
              <h2 className="text-2xl font-bold mb-2">Email Verificado!</h2>
              <p className="text-gray-500 dark:text-gray-400 mb-6">{message}</p>
              <Link href="/login" className="w-full">
                <Button className="w-full h-12 text-lg font-bold rounded-xl gap-2">
                  Ir para o Login
                  <ArrowRight size={20} />
                </Button>
              </Link>
            </div>
          )}

          {status === "error" && (
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4 text-red-600">
                <XCircle size={32} />
              </div>
              <h2 className="text-2xl font-bold mb-2">Erro na Verificação</h2>
              <p className="text-gray-500 dark:text-gray-400 mb-6">{message}</p>
              <Link href="/login" className="w-full">
                <Button
                  variant="outline"
                  className="w-full h-12 text-lg font-bold rounded-xl"
                >
                  Voltar para o Login
                </Button>
              </Link>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
