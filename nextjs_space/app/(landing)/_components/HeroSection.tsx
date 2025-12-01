"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { InteractiveHoverButton } from "@/components/ui/interactive-hover-button";

export function HeroSection() {
  return (
    <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden bg-white">
      {/* Background Gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl pointer-events-none">
        <div className="absolute top-20 left-10 w-96 h-96 bg-blue-100 rounded-full blur-[100px] opacity-50" />
        <div className="absolute bottom-20 right-10 w-[500px] h-[500px] bg-indigo-100 rounded-full blur-[120px] opacity-40" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="flex flex-col items-center text-center max-w-4xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-[#137fec] ring-1 ring-inset ring-blue-700/10 mb-6">
              Novo: Controle de Estoque Inteligente 🚀
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-5xl md:text-7xl font-display font-bold tracking-tight text-zinc-900 mb-6 leading-[1.1]"
          >
            O Sistema Operacional <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#137fec] to-blue-600">
              do Seu Varejo.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-xl text-zinc-600 mb-10 max-w-2xl leading-relaxed"
          >
            Controle total de vendas, estoque e equipe em uma única plataforma
            intuitiva. Simplifique sua operação hoje.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center gap-4"
          >
            <Link href="/signup">
              <InteractiveHoverButton className="h-14 px-8 text-lg bg-[#137fec] border-[#137fec] text-white hover:bg-[#137fec]/90 rounded-full w-full sm:w-auto">
                <span className="flex items-center gap-2">
                  Começar Agora <ArrowRight className="w-5 h-5" />
                </span>
              </InteractiveHoverButton>
            </Link>
            <span className="text-sm text-zinc-500 font-medium">
              14 dias grátis • Sem cartão de crédito
            </span>
          </motion.div>
        </div>

        {/* Abstract Dashboard Visual */}
        <motion.div
          initial={{ opacity: 0, y: 40, rotateX: 20 }}
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          transition={{ duration: 0.8, delay: 0.4, type: "spring" }}
          className="relative max-w-5xl mx-auto perspective-1000"
        >
          <motion.div
            animate={{ y: [0, -15, 0] }}
            transition={{
              duration: 6,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="relative rounded-2xl border border-zinc-200 bg-white/50 backdrop-blur-xl shadow-2xl overflow-hidden aspect-[16/9] md:aspect-[21/9]"
          >
            {/* Mockup Content */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-white/10 p-6 flex flex-col gap-6">
              {/* Header Mock */}
              <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
                <div className="flex gap-4">
                  <div className="w-32 h-8 bg-zinc-100 rounded-lg animate-pulse" />
                  <div className="w-20 h-8 bg-zinc-100 rounded-lg animate-pulse" />
                </div>
                <div className="flex gap-2">
                   <div className="w-8 h-8 rounded-full bg-blue-100" />
                   <div className="w-8 h-8 rounded-full bg-zinc-100" />
                </div>
              </div>

              {/* Content Grid Mock */}
              <div className="grid grid-cols-3 gap-6 h-full">
                 <div className="col-span-2 space-y-4">
                    <div className="w-full h-32 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100/50" />
                    <div className="grid grid-cols-2 gap-4">
                        <div className="h-24 bg-zinc-50 rounded-xl border border-zinc-100" />
                        <div className="h-24 bg-zinc-50 rounded-xl border border-zinc-100" />
                    </div>
                 </div>
                 <div className="col-span-1 space-y-4">
                    <div className="w-full h-full bg-zinc-50 rounded-xl border border-zinc-100" />
                 </div>
              </div>
            </div>

            {/* Glossy Overlay */}
            <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/20 to-transparent pointer-events-none" />
          </motion.div>

          {/* Decorative Elements behind dashboard */}
          <div className="absolute -z-10 -bottom-10 -right-10 w-64 h-64 bg-[#137fec]/20 rounded-full blur-3xl" />
          <div className="absolute -z-10 -top-10 -left-10 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl" />
        </motion.div>
      </div>
    </section>
  );
}
