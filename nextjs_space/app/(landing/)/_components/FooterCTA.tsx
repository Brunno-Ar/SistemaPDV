"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export const FooterCTA = () => {
  return (
    <footer className="bg-zinc-900 py-24 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-blue-600/20 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="container mx-auto px-6 relative z-10 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl mx-auto"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 tracking-tight">
            Pronto para transformar seu varejo?
          </h2>
          <p className="text-xl text-zinc-400 mb-10">
            Junte-se a lojistas que já modernizaram suas operações com o Flow
            PDV.
          </p>

          <div className="flex flex-col items-center justify-center gap-4">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                asChild
                size="lg"
                className="rounded-full text-lg h-14 px-8 bg-white text-zinc-900 hover:bg-gray-100 dark:bg-white dark:text-zinc-900 dark:hover:bg-gray-200"
              >
                <Link href="/signup" className="flex items-center gap-2">
                  Criar Conta Grátis
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </Button>
            </motion.div>

            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="rounded-full text-lg h-14 px-8 bg-transparent border-white text-white hover:bg-white hover:text-zinc-900"
              >
                <Link href="/fale-conosco">FALE CONOSCO</Link>
              </Button>
            </motion.div>
          </div>

          <p className="mt-8 text-sm text-zinc-500">
            Sem cartão de crédito necessário • 14 dias de teste grátis
          </p>
        </motion.div>
      </div>

      <div className="border-t border-zinc-800 mt-24 pt-8">
        <div className="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center text-zinc-500 text-sm">
          <p>© 2025 Flow PDV. Todos os direitos reservados.</p>
          <div className="flex gap-6 mt-4 md:mt-0">
            <Link href="/termos" className="hover:text-white transition-colors">
              Termos
            </Link>
            <Link
              href="/privacidade"
              className="hover:text-white transition-colors"
            >
              Privacidade
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
