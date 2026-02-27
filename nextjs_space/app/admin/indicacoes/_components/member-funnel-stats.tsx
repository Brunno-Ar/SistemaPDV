"use client";

import { MousePointerClick, UserPlus, CreditCard, Gift } from "lucide-react";

interface FunnelData {
  cliques: number;
  trialCount: number;
  pagoCount: number;
  mesesGratis: number;
}

export function MemberFunnelStats({
  cliques,
  trialCount,
  pagoCount,
  mesesGratis,
}: FunnelData) {
  const taxaConversaoTrial =
    cliques > 0 ? ((trialCount / cliques) * 100).toFixed(1) : "0";
  const taxaConversaoPago =
    trialCount > 0 ? ((pagoCount / trialCount) * 100).toFixed(1) : "0";

  const cards = [
    {
      label: "Cliques no Link",
      value: cliques,
      icon: MousePointerClick,
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-50 dark:bg-blue-950/30",
      borderColor: "border-blue-200 dark:border-blue-900/40",
      sub: null,
    },
    {
      label: "Cadastros (Trial)",
      value: trialCount,
      icon: UserPlus,
      color: "text-amber-600 dark:text-amber-400",
      bgColor: "bg-amber-50 dark:bg-amber-950/30",
      borderColor: "border-amber-200 dark:border-amber-900/40",
      sub: `${taxaConversaoTrial}% dos cliques`,
    },
    {
      label: "Assinaturas Pagas",
      value: pagoCount,
      icon: CreditCard,
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-50 dark:bg-green-950/30",
      borderColor: "border-green-200 dark:border-green-900/40",
      sub: `${taxaConversaoPago}% dos trials`,
    },
    {
      label: "Meses Grátis Ganhos",
      value: mesesGratis,
      icon: Gift,
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-50 dark:bg-purple-950/30",
      borderColor: "border-purple-200 dark:border-purple-900/40",
      sub: null,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`flex flex-col gap-2 p-4 rounded-xl border ${card.bgColor} ${card.borderColor} transition-all hover:shadow-md`}
        >
          <div className="flex items-center justify-between">
            <card.icon className={`h-5 w-5 ${card.color}`} />
          </div>
          <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
          <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
            {card.label}
          </p>
          {card.sub && (
            <p className="text-[11px] text-gray-400 dark:text-gray-500">
              {card.sub}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
