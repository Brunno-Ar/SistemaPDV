"use client";

import { motion } from "framer-motion";
import {
  CheckCircle2,
  ChevronRight,
  ShoppingCart,
  Rocket,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { Progress } from "@/components/ui/progress";
import { useEffect, useState } from "react";

interface EmployeeChecklistData {
  hasSale: boolean;
  hasCaixaAberto: boolean;
}

export function EmployeeOnboardingChecklist() {
  const [data, setData] = useState<EmployeeChecklistData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [resAnalytics, resCaixa] = await Promise.all([
          fetch("/api/employee/analytics"),
          fetch("/api/caixa", { cache: "no-store" }),
        ]);

        let hasSale = false;
        let hasCaixaAberto = false;

        if (resAnalytics.ok) {
          const json = await resAnalytics.json();
          hasSale = (json.lastSales?.length ?? 0) > 0;
        }

        if (resCaixa.ok) {
          const json = await resCaixa.json();
          hasCaixaAberto = !!json.caixaAberto;
        }

        setData({ hasSale, hasCaixaAberto });
      } catch {
        setData({ hasSale: false, hasCaixaAberto: false });
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading || !data) return null;

  if (data.hasSale) return null;

  const stepsCompleted = (data.hasCaixaAberto ? 1 : 0) + (data.hasSale ? 1 : 0);
  const totalSteps = 2;
  const progressPercentage = (stepsCompleted / totalSteps) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="mb-6"
    >
      <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-emerald-400/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row gap-8 items-start md:items-center justify-between">
          <div className="space-y-4 max-w-xl text-white">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 rounded-full text-sm font-medium backdrop-blur-md border border-white/10 shadow-sm">
              <Rocket className="w-4 h-4 text-amber-300" />
              <span>Primeiros Passos</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Pronto para começar a vender?
            </h2>
            <p className="text-emerald-100 text-sm sm:text-base leading-relaxed">
              Complete estes dois passos simples para dominar o caixa. É rápido
              e você vai pegar o jeito em minutos!
            </p>

            <div className="space-y-2 pt-2">
              <div className="flex justify-between text-sm font-medium text-emerald-100">
                <span>Seu Progresso</span>
                <span>{progressPercentage}%</span>
              </div>
              <Progress
                value={progressPercentage}
                className="h-2 bg-white/20"
              />
            </div>
          </div>

          <div className="w-full md:w-auto flex-1 max-w-sm space-y-3">
            {/* Passo 1 - Abrir o Caixa */}
            <Link href="/vender">
              <div
                className={`group relative overflow-hidden flex items-center p-4 rounded-2xl transition-all duration-300 cursor-pointer border ${
                  data.hasCaixaAberto
                    ? "bg-white/10 border-white/10"
                    : "bg-white/90 border-white shadow-lg hover:shadow-xl hover:-translate-y-1"
                }`}
              >
                <div
                  className={`p-3 rounded-xl mr-4 ${
                    data.hasCaixaAberto
                      ? "bg-white/10 text-white"
                      : "bg-emerald-100 text-emerald-600"
                  }`}
                >
                  {data.hasCaixaAberto ? (
                    <CheckCircle2 className="w-6 h-6" />
                  ) : (
                    <Wallet className="w-6 h-6" />
                  )}
                </div>
                <div className="flex-1">
                  <h3
                    className={`font-bold text-sm ${
                      data.hasCaixaAberto
                        ? "text-white line-through opacity-70"
                        : "text-gray-900"
                    }`}
                  >
                    1. Abrir o seu Caixa
                  </h3>
                  {!data.hasCaixaAberto && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      Vá em Vender e informe o troco inicial
                    </p>
                  )}
                </div>
                {!data.hasCaixaAberto && (
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-emerald-600 transition-colors" />
                )}
              </div>
            </Link>

            {/* Passo 2 - Fazer primeira venda */}
            <Link href="/vender">
              <div
                className={`group relative overflow-hidden flex items-center p-4 rounded-2xl transition-all duration-300 cursor-pointer border mt-3 ${
                  data.hasSale
                    ? "bg-white/10 border-white/10"
                    : !data.hasCaixaAberto
                      ? "bg-white/10 border-white/10 opacity-70 pointer-events-none"
                      : "bg-white/90 border-white shadow-lg hover:shadow-xl hover:-translate-y-1"
                }`}
              >
                <div
                  className={`p-3 rounded-xl mr-4 ${
                    data.hasSale
                      ? "bg-white/10 text-white"
                      : !data.hasCaixaAberto
                        ? "bg-white/20 text-white/50"
                        : "bg-amber-100 text-amber-600"
                  }`}
                >
                  {data.hasSale ? (
                    <CheckCircle2 className="w-6 h-6" />
                  ) : (
                    <ShoppingCart className="w-6 h-6" />
                  )}
                </div>
                <div className="flex-1">
                  <h3
                    className={`font-bold text-sm ${
                      data.hasSale
                        ? "text-white line-through opacity-70"
                        : !data.hasCaixaAberto
                          ? "text-white/70"
                          : "text-gray-900"
                    }`}
                  >
                    2. Fazer sua primeira Venda
                  </h3>
                  {!data.hasSale && data.hasCaixaAberto && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      Busque um produto e finalize a venda
                    </p>
                  )}
                  {!data.hasCaixaAberto && !data.hasSale && (
                    <p className="text-xs text-white/50 mt-0.5">
                      Abra o caixa primeiro
                    </p>
                  )}
                </div>
                {!data.hasSale && data.hasCaixaAberto && (
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-amber-600 transition-colors" />
                )}
              </div>
            </Link>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
