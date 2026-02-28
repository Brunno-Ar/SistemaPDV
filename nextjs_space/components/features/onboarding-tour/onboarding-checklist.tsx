"use client";

import { motion } from "framer-motion";
import {
  CheckCircle2,
  ChevronRight,
  PackagePlus,
  ShoppingCart,
  Rocket,
} from "lucide-react";
import Link from "next/link";
import { useAdminDashboard } from "@/hooks/use-admin-dashboard";
import { Progress } from "@/components/ui/progress";

export function OnboardingChecklist() {
  const { stats, loading } = useAdminDashboard();

  if (loading) return null;

  // Se já concluiu ambas as etapas, não exibir a checklist
  if (stats && stats.totalProdutos > 0 && (stats.totalVendasAllTime ?? 0) > 0) {
    return null;
  }

  const hasProduct = stats && stats.totalProdutos > 0;
  const hasSale = stats && (stats.totalVendasAllTime ?? 0) > 0;

  const stepsCompleted = (hasProduct ? 1 : 0) + (hasSale ? 1 : 0);
  const totalSteps = 2;
  const progressPercentage = (stepsCompleted / totalSteps) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="mb-8"
    >
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        {/* Background Decorations */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-blue-400/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row gap-8 items-start md:items-center justify-between">
          <div className="space-y-4 max-w-xl text-white">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 rounded-full text-sm font-medium backdrop-blur-md border border-white/10 shadow-sm">
              <Rocket className="w-4 h-4 text-amber-300" />
              <span>Bem-vindo ao FlowPDV</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Vamos começar a sua jornada!
            </h2>
            <p className="text-blue-100 text-sm sm:text-base leading-relaxed">
              Complete estes passos iniciais para configurar o seu sistema e
              liberar todo o potencial do FlowPDV para a sua empresa. Nossas
              dicas te ajudam a usar a ferramenta da melhor forma.
            </p>

            <div className="space-y-2 pt-2">
              <div className="flex justify-between text-sm font-medium text-blue-100">
                <span>Progresso Configuração</span>
                <span>{progressPercentage}%</span>
              </div>
              <Progress
                value={progressPercentage}
                className="h-2 bg-white/20"
              />
            </div>
          </div>

          <div className="w-full md:w-auto flex-1 max-w-sm space-y-3">
            {/* Passo 1 - Cadastrar Produto */}
            <Link href="/admin/produtos">
              <div
                className={`group relative overflow-hidden flex items-center p-4 rounded-2xl transition-all duration-300 cursor-pointer border ${
                  hasProduct
                    ? "bg-white/10 border-white/10"
                    : "bg-white/90 border-white shadow-lg hover:shadow-xl hover:-translate-y-1"
                }`}
              >
                <div
                  className={`p-3 rounded-xl mr-4 ${
                    hasProduct
                      ? "bg-white/10 text-white"
                      : "bg-blue-100 text-blue-600"
                  }`}
                >
                  {hasProduct ? (
                    <CheckCircle2 className="w-6 h-6" />
                  ) : (
                    <PackagePlus className="w-6 h-6" />
                  )}
                </div>
                <div className="flex-1">
                  <h3
                    className={`font-bold text-sm ${hasProduct ? "text-white line-through opacity-70" : "text-gray-900"}`}
                  >
                    1. Cadastrar seu primeiro produto
                  </h3>
                  {!hasProduct && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      Vá em estoque e clique em Novo
                    </p>
                  )}
                </div>
                {!hasProduct && (
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                )}
              </div>
            </Link>

            {/* Passo 2 - Venda Teste */}
            <Link href="/pdv" passHref>
              <div
                className={`group relative overflow-hidden flex items-center p-4 rounded-2xl transition-all duration-300 cursor-pointer border ${
                  hasSale
                    ? "bg-white/10 border-white/10"
                    : !hasProduct
                      ? "bg-white/10 border-white/10 opacity-70 pointer-events-none"
                      : "bg-white/90 border-white shadow-lg hover:shadow-xl hover:-translate-y-1"
                }`}
              >
                <div
                  className={`p-3 rounded-xl mr-4 ${
                    hasSale
                      ? "bg-white/10 text-white"
                      : !hasProduct
                        ? "bg-white/20 text-white/50"
                        : "bg-emerald-100 text-emerald-600"
                  }`}
                >
                  {hasSale ? (
                    <CheckCircle2 className="w-6 h-6" />
                  ) : (
                    <ShoppingCart className="w-6 h-6" />
                  )}
                </div>
                <div className="flex-1">
                  <h3
                    className={`font-bold text-sm ${
                      hasSale
                        ? "text-white line-through opacity-70"
                        : !hasProduct
                          ? "text-white/70"
                          : "text-gray-900"
                    }`}
                  >
                    2. Fazer uma Venda Teste
                  </h3>
                  {!hasSale && hasProduct && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      Vá ao PDV e passe o produto
                    </p>
                  )}
                  {!hasProduct && !hasSale && (
                    <p className="text-xs text-white/50 mt-0.5">
                      Requer um produto cadastrado
                    </p>
                  )}
                </div>
                {!hasSale && hasProduct && (
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-emerald-600 transition-colors" />
                )}
              </div>
            </Link>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
