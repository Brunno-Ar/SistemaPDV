"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, TrendingUp, Users, ShoppingBag } from "lucide-react";

const AUDIENCES = [
  {
    id: "owner",
    label: "Para o Dono",
    icon: TrendingUp,
    title: "Controle Total e Visão Estratégica",
    description:
      "Acompanhe o faturamento em tempo real, identifique gargalos e tome decisões baseadas em dados, não em achismos.",
    features: [
      "Dashboard Financeiro em Tempo Real",
      "Relatórios de Lucratividade por Produto",
      "Controle de Fluxo de Caixa",
      "Gestão Multi-lojas",
    ],
  },
  {
    id: "manager",
    label: "Para o Gerente",
    icon: Users,
    title: "Gestão de Equipe e Operação",
    description:
      "Simplifique a gestão de turnos, metas e estoque. Garanta que a loja funcione perfeitamente mesmo quando você não está olhando.",
    features: [
      "Controle de Metas Individuais",
      "Gestão de Escalas e Turnos",
      "Auditoria de Estoque Simplificada",
      "Aprovação de Descontos e Sangrias",
    ],
  },
  {
    id: "seller",
    label: "Para o Vendedor",
    icon: ShoppingBag,
    title: "Agilidade e Foco na Venda",
    description:
      "Um PDV que não trava e ajuda a vender mais. Menos tempo burocrático, mais tempo com o cliente.",
    features: [
      "PDV Ultra Rápido e Intuitivo",
      "Consulta de Estoque Instantânea",
      "Visualização de Comissões em Tempo Real",
      "Histórico de Clientes no Caixa",
    ],
  },
];

export const AudienceSection = () => {
  const [activeTab, setActiveTab] = useState(AUDIENCES[0].id);

  return (
    <section className="py-24 bg-gray-100 dark:bg-zinc-900">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Feito para cada papel do seu negócio
          </h2>
          <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            O Flow PDV se adapta às necessidades de quem usa, entregando a
            informação certa para a pessoa certa.
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-8 max-w-5xl mx-auto">
          {/* Tabs Navigation */}
          <div className="flex md:flex-col gap-2 md:w-1/3 overflow-x-auto md:overflow-visible pb-4 md:pb-0">
            {AUDIENCES.map((audience) => (
              <button
                key={audience.id}
                onClick={() => setActiveTab(audience.id)}
                className={`flex items-center gap-3 p-4 rounded-xl text-left transition-all duration-300 relative ${
                  activeTab === audience.id
                    ? "bg-white dark:bg-zinc-800 shadow-lg shadow-blue-900/5 text-blue-600 dark:text-blue-400"
                    : "text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-zinc-800/50 hover:text-gray-800 dark:hover:text-gray-300"
                }`}
              >
                <audience.icon
                  size={24}
                  className={
                    activeTab === audience.id
                      ? "text-blue-600 dark:text-blue-400"
                      : "text-gray-500 dark:text-gray-500"
                  }
                />
                <span className="font-semibold whitespace-nowrap">
                  {audience.label}
                </span>
                {activeTab === audience.id && (
                  <motion.div
                    layoutId="activeTabIndicator"
                    className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600 dark:bg-blue-400 rounded-l-xl hidden md:block"
                  />
                )}
              </button>
            ))}
          </div>

          {/* Content Area */}
          <div className="md:w-2/3 bg-white dark:bg-zinc-800 rounded-3xl p-8 md:p-12 shadow-xl shadow-gray-200/50 dark:shadow-black/20 border border-gray-300 dark:border-zinc-700 min-h-[400px]">
            <AnimatePresence mode="wait">
              {AUDIENCES.map(
                (audience) =>
                  activeTab === audience.id && (
                    <motion.div
                      key={audience.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.3 }}
                      className="h-full flex flex-col justify-center"
                    >
                      <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400 mb-6">
                        <audience.icon size={24} />
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                        {audience.title}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
                        {audience.description}
                      </p>
                      <ul className="space-y-4">
                        {audience.features.map((feature, idx) => (
                          <motion.li
                            key={idx}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className="flex items-center gap-3 text-gray-800 dark:text-gray-300 font-medium"
                          >
                            <CheckCircle2 className="text-green-500 dark:text-green-400 w-5 h-5 flex-shrink-0" />
                            {feature}
                          </motion.li>
                        ))}
                      </ul>
                    </motion.div>
                  ),
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
};
