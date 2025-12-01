"use client";

import { motion } from "framer-motion";
import {
  ArrowUpRight,
  BellRing,
  CreditCard,
  DollarSign,
  Package,
  TrendingUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export function BentoGridSection() {
  return (
    <section id="features" className="py-24 bg-zinc-50/50">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-zinc-900 mb-6">
            Tudo o que você precisa. <br />
            <span className="text-zinc-400">Em um só lugar.</span>
          </h2>
          <p className="text-lg text-zinc-600">
            Ferramentas poderosas projetadas para simplificar cada aspecto do
            seu negócio, do estoque ao financeiro.
          </p>
        </div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-1 md:grid-cols-6 md:grid-rows-2 gap-6 h-auto md:h-[600px]"
        >
          {/* Card Grande: PDV */}
          <motion.div
            variants={item}
            whileHover={{ y: -5, boxShadow: "0 20px 40px -15px rgba(19, 127, 236, 0.2)" }}
            className="md:col-span-4 md:row-span-2 rounded-3xl bg-white border border-zinc-200 p-8 flex flex-col justify-between overflow-hidden relative group"
          >
            <div className="relative z-10">
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center mb-6 text-[#137fec]">
                <CreditCard className="w-6 h-6" />
              </div>
              <h3 className="text-2xl font-bold text-zinc-900 mb-2">
                Frente de Caixa Ultra Rápido
              </h3>
              <p className="text-zinc-500 max-w-sm">
                Realize vendas em segundos. Interface limpa, atalhos de teclado
                e integração total com o estoque.
              </p>
            </div>

            {/* Visual Abstracto do PDV */}
            <div className="absolute right-0 bottom-0 w-[80%] h-[70%] bg-zinc-50 rounded-tl-3xl border-t border-l border-zinc-100 p-6 transition-transform group-hover:scale-105 duration-500">
              <div className="grid grid-cols-2 gap-4 h-full opacity-50">
                 <div className="bg-white rounded-xl shadow-sm h-32 w-full animate-pulse delay-75"></div>
                 <div className="bg-white rounded-xl shadow-sm h-32 w-full animate-pulse delay-100"></div>
                 <div className="bg-white rounded-xl shadow-sm h-32 w-full animate-pulse delay-150"></div>
                 <div className="bg-white rounded-xl shadow-sm h-32 w-full animate-pulse delay-200"></div>
              </div>
              {/* Overlay Gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent"></div>
            </div>
          </motion.div>

          {/* Card Médio: Estoque */}
          <motion.div
            variants={item}
            whileHover={{ y: -5, boxShadow: "0 20px 40px -15px rgba(234, 179, 8, 0.2)" }}
            className="md:col-span-2 rounded-3xl bg-white border border-zinc-200 p-6 flex flex-col relative overflow-hidden group"
          >
            <div className="flex items-start justify-between mb-4 relative z-10">
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600">
                <Package className="w-5 h-5" />
              </div>
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                FEFO Ready
              </Badge>
            </div>
            <h3 className="text-lg font-bold text-zinc-900">Gestão de Estoque</h3>

            {/* Visual Mini Lista */}
            <div className="mt-6 space-y-3 relative z-10">
              <div className="flex items-center justify-between p-2 bg-zinc-50 rounded-lg border border-zinc-100 text-xs">
                 <span className="font-medium text-zinc-700">Leite Integral</span>
                 <span className="text-amber-600 font-bold bg-amber-100 px-1.5 py-0.5 rounded">Vence em 2d</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-zinc-50 rounded-lg border border-zinc-100 text-xs opacity-60">
                 <span className="font-medium text-zinc-700">Pão de Forma</span>
                 <span className="text-zinc-500">Vence em 5d</span>
              </div>
            </div>
          </motion.div>

          {/* Card Médio: Financeiro */}
          <motion.div
            variants={item}
            whileHover={{ y: -5, boxShadow: "0 20px 40px -15px rgba(34, 197, 94, 0.2)" }}
            className="md:col-span-1 rounded-3xl bg-white border border-zinc-200 p-6 flex flex-col justify-between group overflow-hidden"
          >
             <div className="relative z-10">
                <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600 mb-4">
                  <DollarSign className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-zinc-900 leading-tight">Controle <br/>Financeiro</h3>
             </div>

             {/* Chart Visual */}
             <div className="mt-4 h-16 w-full flex items-end gap-1 opacity-80">
                <div className="w-1/4 h-[40%] bg-emerald-200 rounded-t-sm"></div>
                <div className="w-1/4 h-[60%] bg-emerald-300 rounded-t-sm"></div>
                <div className="w-1/4 h-[50%] bg-emerald-400 rounded-t-sm"></div>
                <div className="w-1/4 h-[90%] bg-emerald-500 rounded-t-sm"></div>
             </div>
          </motion.div>

          {/* Card Pequeno: Mural */}
          <motion.div
            variants={item}
            whileHover={{ y: -5, boxShadow: "0 20px 40px -15px rgba(239, 68, 68, 0.2)" }}
            className="md:col-span-1 rounded-3xl bg-white border border-zinc-200 p-6 flex flex-col group overflow-hidden"
          >
             <div className="flex items-center justify-between mb-6">
                <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center text-red-600">
                   <BellRing className="w-5 h-5" />
                </div>
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
             </div>
             <h3 className="text-lg font-bold text-zinc-900 mb-1">Mural</h3>
             <div className="mt-auto bg-zinc-50 p-3 rounded-xl border border-zinc-100">
                <div className="flex gap-2 items-center">
                   <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-[10px] font-bold text-blue-600">AD</div>
                   <div className="flex-1">
                      <div className="h-2 w-16 bg-zinc-200 rounded mb-1"></div>
                      <div className="h-1.5 w-10 bg-zinc-100 rounded"></div>
                   </div>
                </div>
             </div>
          </motion.div>

        </motion.div>
      </div>
    </section>
  );
}
