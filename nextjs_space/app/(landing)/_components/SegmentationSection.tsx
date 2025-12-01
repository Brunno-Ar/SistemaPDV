"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Briefcase, Crown, ScanBarcode, CheckCircle2 } from "lucide-react";

const ROLES = [
  {
    id: "master",
    label: "Para o Dono",
    icon: Crown,
    color: "bg-yellow-500",
    title: "Visão total do seu império.",
    description: "Acesse métricas de todas as suas lojas em tempo real. Gerencie permissões, planos e veja o lucro líquido consolidado sem planilhas complexas.",
    features: ["Dashboard Multi-loja", "Controle de Lucratividade", "Gestão de Assinaturas"],
  },
  {
    id: "admin",
    label: "Para o Gerente",
    icon: Briefcase,
    color: "bg-blue-500",
    title: "Lidere sua equipe com dados.",
    description: "Defina metas, acompanhe o desempenho individual de cada vendedor e gerencie o estoque para garantir que nunca falte o produto certo.",
    features: ["Metas de Venda", "Curva ABC de Produtos", "Auditoria de Caixa"],
  },
  {
    id: "vendedor",
    label: "Para o Vendedor",
    icon: ScanBarcode,
    color: "bg-green-500",
    title: "Venda mais, digite menos.",
    description: "Um PDV projetado para agilidade. Feche vendas em segundos, consulte preços rapidamente e bata suas metas diárias com facilidade.",
    features: ["Frente de Caixa Ágil", "Consulta de Estoque Rápida", "Minhas Vendas"],
  },
];

export function SegmentationSection() {
  const [activeTab, setActiveTab] = useState(ROLES[0]);

  return (
    <section className="py-24 bg-white overflow-hidden">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-zinc-900 mb-4">
            Feito para cada papel da sua operação
          </h2>
          <div className="flex flex-wrap justify-center gap-2 mt-8">
            {ROLES.map((role) => (
              <button
                key={role.id}
                onClick={() => setActiveTab(role)}
                className={`relative px-6 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                  activeTab.id === role.id
                    ? "text-zinc-900 bg-zinc-100"
                    : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50"
                }`}
              >
                {role.label}
                {activeTab.id === role.id && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-zinc-100 rounded-full -z-10"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="max-w-5xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center"
            >
              <div className="space-y-6">
                <div className={`w-16 h-16 rounded-2xl ${activeTab.color} bg-opacity-10 flex items-center justify-center`}>
                  <activeTab.icon className={`w-8 h-8 ${activeTab.color.replace("bg-", "text-")}`} />
                </div>
                <h3 className="text-3xl md:text-4xl font-bold text-zinc-900 leading-tight">
                  {activeTab.title}
                </h3>
                <p className="text-lg text-zinc-600 leading-relaxed">
                  {activeTab.description}
                </p>
                <ul className="space-y-3 pt-4">
                  {activeTab.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-3 text-zinc-700 font-medium">
                      <CheckCircle2 className="w-5 h-5 text-[#137fec]" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="relative aspect-square md:aspect-auto md:h-[400px] rounded-3xl bg-zinc-50 border border-zinc-100 p-8 flex items-center justify-center overflow-hidden">
                {/* Large Icon Background */}
                <activeTab.icon className="absolute w-[120%] h-[120%] text-zinc-200/50 -bottom-10 -right-10 rotate-12" />

                {/* Floating Card Visual */}
                <motion.div
                   initial={{ y: 20, opacity: 0 }}
                   animate={{ y: 0, opacity: 1 }}
                   transition={{ delay: 0.2 }}
                   className="relative z-10 bg-white shadow-xl rounded-2xl p-6 w-64 border border-zinc-100"
                >
                   <div className="w-12 h-12 rounded-full bg-zinc-100 mb-4 flex items-center justify-center">
                      <activeTab.icon className="w-6 h-6 text-zinc-900" />
                   </div>
                   <div className="h-4 w-3/4 bg-zinc-100 rounded mb-2" />
                   <div className="h-4 w-1/2 bg-zinc-100 rounded" />
                </motion.div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
