"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, BarChart3, ShoppingCart, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Hero = () => {
  return (
    <section className="relative pt-32 pb-20 overflow-hidden bg-gradient-to-b from-blue-100/50 to-white dark:from-zinc-900 dark:to-zinc-950 transition-colors duration-300">
      <div className="container mx-auto px-6 text-center z-10 relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-sm font-medium mb-6 border border-blue-200 dark:border-blue-800">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            Novidade: Controle de Lotes e Validade (FEFO)
          </div>

          <h1 className="text-5xl md:text-7xl font-bold text-gray-900 dark:text-white tracking-tight mb-6 leading-tight">
            O Sistema Operacional <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-blue-400">
              do Seu Varejo.
            </span>
          </h1>

          <p className="text-xl text-gray-600 dark:text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            Controle total de vendas, estoque e equipe em uma única plataforma
            intuitiva. Simplifique sua operação e aumente seus lucros.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                asChild
                size="lg"
                className="rounded-full text-lg h-14 px-8 shadow-lg shadow-blue-600/25"
              >
                <Link href="/signup" className="flex items-center gap-2">
                  Começar Agora
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="rounded-full text-lg h-14 px-8 bg-white dark:bg-zinc-900 border-gray-300 dark:border-zinc-800 hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-800 dark:text-gray-300"
              >
                <Link href="/signup">Teste por 14 dias grátis</Link>
              </Button>
            </motion.div>
          </div>
        </motion.div>

        {/* Dashboard Mockup */}
        <motion.div
          initial={{ opacity: 0, y: 100, rotateX: 20 }}
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          transition={{ duration: 1, delay: 0.2, type: "spring" }}
          className="relative max-w-5xl mx-auto perspective-1000"
        >
          <motion.div
            animate={{ y: [0, -20, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className="relative rounded-xl bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-800 shadow-2xl overflow-hidden"
          >
            {/* Mockup Header */}
            <div className="h-12 bg-gray-100 dark:bg-zinc-900/50 border-b border-gray-300 dark:border-zinc-800 flex items-center px-4 gap-2">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                <div className="w-3 h-3 rounded-full bg-green-400"></div>
              </div>
              <div className="flex-1 text-center text-xs text-gray-400 font-mono">
                flow-pdv.app
              </div>
            </div>

            {/* Mockup Content */}
            <div className="p-6 grid grid-cols-12 gap-6 bg-gray-100/50 dark:bg-zinc-950/50 h-[400px] md:h-[600px] overflow-hidden">
              {/* Sidebar */}
              <div className="hidden md:block col-span-2 bg-white dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-zinc-800 p-4 space-y-4">
                <div className="h-8 w-8 bg-blue-600 rounded-lg mb-6"></div>
                <div className="h-2 w-20 bg-gray-200 dark:bg-zinc-800 rounded"></div>
                <div className="h-2 w-16 bg-gray-200 dark:bg-zinc-800 rounded"></div>
                <div className="h-2 w-24 bg-gray-200 dark:bg-zinc-800 rounded"></div>
                <div className="h-2 w-20 bg-gray-200 dark:bg-zinc-800 rounded"></div>
              </div>

              {/* Main Content */}
              <div className="col-span-12 md:col-span-10 space-y-6">
                {/* Stats Row */}
                <div className="grid grid-cols-3 gap-4">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="bg-white dark:bg-zinc-900 p-4 rounded-lg border border-gray-200 dark:border-zinc-800 shadow-sm"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="h-8 w-8 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                          {i === 1 ? (
                            <BarChart3 size={16} />
                          ) : i === 2 ? (
                            <ShoppingCart size={16} />
                          ) : (
                            <Users size={16} />
                          )}
                        </div>
                        <div className="h-4 w-10 bg-green-100 dark:bg-green-900/20 rounded-full text-green-600 dark:text-green-400 text-[10px] flex items-center justify-center">
                          +12%
                        </div>
                      </div>
                      <div className="h-6 w-24 bg-gray-200 dark:bg-zinc-800 rounded mb-1"></div>
                      <div className="h-3 w-16 bg-gray-100 dark:bg-zinc-800/50 rounded"></div>
                    </div>
                  ))}
                </div>

                {/* Chart Area */}
                <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg border border-gray-200 dark:border-zinc-800 shadow-sm h-64 flex items-end justify-between gap-2">
                  {[40, 65, 45, 80, 55, 90, 70, 85, 60, 75, 50, 95].map(
                    (h, i) => (
                      <motion.div
                        key={i}
                        initial={{ height: 0 }}
                        whileInView={{ height: `${h}%` }}
                        transition={{ duration: 1, delay: i * 0.05 }}
                        className="w-full bg-blue-100 dark:bg-blue-900/40 rounded-t-sm hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors relative group"
                      >
                        <div className="absolute bottom-0 w-full bg-blue-500 h-[20%] opacity-20 group-hover:opacity-40 transition-opacity"></div>
                      </motion.div>
                    )
                  )}
                </div>

                {/* Recent Transactions */}
                <div className="bg-white dark:bg-zinc-900 p-4 rounded-lg border border-gray-200 dark:border-zinc-800 shadow-sm">
                  <div className="flex justify-between mb-4">
                    <div className="h-4 w-32 bg-gray-200 dark:bg-zinc-800 rounded"></div>
                    <div className="h-4 w-16 bg-gray-200 dark:bg-zinc-800 rounded"></div>
                  </div>
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="flex justify-between items-center py-3 border-b border-gray-100 dark:border-zinc-800 last:border-0"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-zinc-800"></div>
                        <div>
                          <div className="h-3 w-24 bg-gray-200 dark:bg-zinc-800 rounded mb-1"></div>
                          <div className="h-2 w-16 bg-gray-100 dark:bg-zinc-800/50 rounded"></div>
                        </div>
                      </div>
                      <div className="h-4 w-16 bg-gray-200 dark:bg-zinc-800 rounded"></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Decorative Elements behind mockup */}
          <div className="absolute -top-20 -right-20 w-72 h-72 bg-blue-400/20 rounded-full blur-3xl -z-10"></div>
          <div className="absolute -bottom-20 -left-20 w-72 h-72 bg-purple-400/20 rounded-full blur-3xl -z-10"></div>
        </motion.div>
      </div>
    </section>
  );
};
