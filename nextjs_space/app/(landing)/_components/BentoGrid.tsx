"use client";

import { motion } from "framer-motion";
import {
  ShoppingCart,
  Package,
  DollarSign,
  Bell,
  ArrowUpRight,
} from "lucide-react";

const BentoCard = ({
  children,
  className,
  title,
  description,
  icon: Icon,
  delay = 0,
}: {
  children?: React.ReactNode;
  className?: string;
  title: string;
  description: string;
  icon: any;
  delay?: number;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay }}
    whileHover={{ y: -5, boxShadow: "0 20px 40px -15px rgba(0,0,0,0.1)" }}
    className={`relative overflow-hidden rounded-3xl bg-gray-100 dark:bg-zinc-900 border border-gray-300 dark:border-zinc-800 p-6 flex flex-col justify-between group ${className}`}
  >
    <div className="mb-4">
      <div className="w-10 h-10 rounded-full bg-white dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 flex items-center justify-center mb-4 text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:border-blue-100 dark:group-hover:border-blue-900 transition-colors">
        <Icon size={20} />
      </div>
      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
        {title}
      </h3>
      <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
        {description}
      </p>
    </div>
    <div className="relative flex-1 min-h-[100px] rounded-xl bg-white dark:bg-zinc-950 border border-gray-300 dark:border-zinc-800 overflow-hidden group-hover:border-blue-100 dark:group-hover:border-blue-900 transition-colors">
      {children}
    </div>
    <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity text-blue-600 dark:text-blue-400">
      <ArrowUpRight size={20} />
    </div>
  </motion.div>
);

export const BentoGrid = () => {
  return (
    <section className="py-24 bg-white dark:bg-zinc-950">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          className="text-center max-w-2xl mx-auto mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4 tracking-tight">
            Tudo o que você precisa. <br />
            <span className="text-gray-500 dark:text-gray-600">
              Nada que você não precise.
            </span>
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Uma suíte completa de ferramentas projetadas para escalar sua
            operação de varejo.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto h-auto md:h-[800px]">
          {/* Card 1: PDV (Large - Spans 2 cols, 2 rows on desktop) */}
          <BentoCard
            title="Frente de Caixa (PDV)"
            description="Vendas ultra rápidas, atalhos de teclado e funcionamento offline. Seus vendedores nunca mais vão perder uma venda por lentidão."
            icon={ShoppingCart}
            className="md:col-span-2 md:row-span-2 bg-blue-50/50 dark:bg-blue-900/10"
          >
            {/* Abstract UI Representation */}
            <div className="absolute inset-0 p-4 flex flex-col gap-2">
              <div className="flex gap-2 h-full">
                <div className="w-2/3 h-full bg-gray-100 dark:bg-zinc-900 rounded-lg border border-gray-300 dark:border-zinc-800 p-2 grid grid-cols-3 gap-2 overflow-hidden">
                  {[...Array(9)].map((_, i) => (
                    <div
                      key={i}
                      className="bg-white dark:bg-zinc-800 rounded border border-gray-300 dark:border-zinc-700 h-20"
                    ></div>
                  ))}
                </div>
                <div className="w-1/3 h-full bg-white dark:bg-zinc-800 rounded-lg border border-gray-300 dark:border-zinc-700 shadow-sm p-3 flex flex-col">
                  <div className="flex-1 space-y-2">
                    <div className="h-2 w-full bg-gray-200 dark:bg-zinc-700 rounded"></div>
                    <div className="h-2 w-full bg-gray-200 dark:bg-zinc-700 rounded"></div>
                    <div className="h-2 w-2/3 bg-gray-200 dark:bg-zinc-700 rounded"></div>
                  </div>
                  <div className="h-10 bg-blue-600 rounded mt-2 w-full"></div>
                </div>
              </div>
            </div>
          </BentoCard>

          {/* Card 2: Estoque FEFO (Medium) */}
          <BentoCard
            title="Gestão de Estoque FEFO"
            description="Controle inteligente de validade (First Expired, First Out). Reduza perdas e maximize a rotatividade."
            icon={Package}
            delay={0.1}
            className="md:col-span-1 md:row-span-1"
          >
            <div className="absolute inset-0 flex items-center justify-center p-4">
              <div className="w-full space-y-2">
                <div className="flex justify-between text-xs text-gray-500 px-1">
                  <span>Lote A</span>
                  <span className="text-red-500">Vence em 2 dias</span>
                </div>
                <div className="h-2 w-full bg-gray-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full w-[90%] bg-red-400 rounded-full"></div>
                </div>
                <div className="flex justify-between text-xs text-gray-500 px-1 mt-2">
                  <span>Lote B</span>
                  <span className="text-green-500">Vence em 45 dias</span>
                </div>
                <div className="h-2 w-full bg-gray-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full w-[30%] bg-green-400 rounded-full"></div>
                </div>
              </div>
            </div>
          </BentoCard>

          {/* Card 3: Financeiro (Medium) */}
          <BentoCard
            title="Controle Financeiro"
            description="Auditoria de caixa em tempo real, DRE simplificado e controle de contas a pagar/receber."
            icon={DollarSign}
            delay={0.2}
            className="md:col-span-1 md:row-span-1"
          >
            <div className="absolute inset-0 flex items-end justify-center pb-0 px-6">
              <div className="flex items-end gap-2 w-full h-24">
                <div className="w-1/4 h-[40%] bg-blue-100 dark:bg-blue-900/40 rounded-t"></div>
                <div className="w-1/4 h-[70%] bg-blue-200 dark:bg-blue-800/60 rounded-t"></div>
                <div className="w-1/4 h-[50%] bg-blue-300 dark:bg-blue-700/80 rounded-t"></div>
                <div className="w-1/4 h-[90%] bg-blue-500 dark:bg-blue-600 rounded-t shadow-lg shadow-blue-200 dark:shadow-blue-900/20"></div>
              </div>
            </div>
          </BentoCard>

          {/* Card 4: Mural (Small/Wide) */}
          <BentoCard
            title="Mural de Avisos"
            description="Comunicação interna eficiente. Mantenha toda a equipe alinhada com metas e novidades."
            icon={Bell}
            delay={0.3}
            className="md:col-span-3 md:row-span-1 flex-row items-center gap-6"
          >
            <div className="absolute inset-0 p-4 flex items-center gap-4 overflow-hidden">
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-900/50 p-3 rounded-lg w-full max-w-xs shadow-sm -rotate-2">
                <div className="h-2 w-16 bg-yellow-200 dark:bg-yellow-800 rounded mb-2"></div>
                <div className="h-2 w-full bg-yellow-100 dark:bg-yellow-900/50 rounded mb-1"></div>
                <div className="h-2 w-2/3 bg-yellow-100 dark:bg-yellow-900/50 rounded"></div>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900/50 p-3 rounded-lg w-full max-w-xs shadow-sm rotate-1">
                <div className="h-2 w-16 bg-blue-200 dark:bg-blue-800 rounded mb-2"></div>
                <div className="h-2 w-full bg-blue-100 dark:bg-blue-900/50 rounded mb-1"></div>
                <div className="h-2 w-2/3 bg-blue-100 dark:bg-blue-900/50 rounded"></div>
              </div>
            </div>
          </BentoCard>
        </div>
      </div>
    </section>
  );
};
