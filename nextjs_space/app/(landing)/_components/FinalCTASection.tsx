"use client";

import Link from "next/link";
import { InteractiveHoverButton } from "@/components/ui/interactive-hover-button";

export function FinalCTASection() {
  return (
    <section className="py-24 bg-zinc-900 text-white relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-[#137fec]/20 rounded-full blur-[100px] opacity-30" />
      </div>

      <div className="container mx-auto px-4 relative z-10 text-center">
        <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
          Pronto para transformar sua gestão?
        </h2>
        <p className="text-xl text-zinc-400 mb-10 max-w-2xl mx-auto">
          Junte-se a centenas de varejistas que já estão otimizando suas vendas e estoque com o FlowPDV.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/signup">
            <InteractiveHoverButton className="w-full sm:w-auto px-8 h-14 text-lg bg-white border-white text-zinc-900 hover:bg-zinc-100 hover:text-zinc-900">
              Começar Agora Gratuitamente
            </InteractiveHoverButton>
          </Link>
        </div>
        <p className="mt-6 text-sm text-zinc-500">
          Não é necessário cartão de crédito para começar.
        </p>
      </div>
    </section>
  );
}
