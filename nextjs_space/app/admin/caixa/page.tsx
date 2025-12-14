"use client";

import { MeuCaixa } from "@/app/(funcionario)/dashboard/_components/meu-caixa";
import { CaixasVisaoGeral } from "@/components/dashboard/caixas-visao-geral";
import { PageHeader } from "@/components/ui/page-header";

export default function AdminCaixaPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Caixa"
        description="Gerenciamento de caixa e visão geral da loja."
      />

      {/* Caixa do Admin (funcionalidade completa de funcionário) */}
      <div className="space-y-6">
        <MeuCaixa simpleMode={true} />
      </div>

      {/* Visão Geral dos Caixas da Loja (movido do dashboard) */}
      <div className="pt-6 border-t dark:border-zinc-800">
        <h2 className="text-lg font-semibold mb-4">Visão Geral da Loja</h2>
        <CaixasVisaoGeral />
      </div>
    </div>
  );
}
