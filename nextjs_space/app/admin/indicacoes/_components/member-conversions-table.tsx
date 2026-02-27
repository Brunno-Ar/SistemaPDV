"use client";

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Conversao {
  id: string;
  novaEmpresaId: string;
  status: "TRIAL" | "PAGO";
  mesGratisGerado: boolean;
  criadoEm: string;
  novaEmpresa: {
    nome: string;
  };
}

export function MemberConversionsTable({
  conversoes,
}: {
  conversoes: Conversao[];
}) {
  if (conversoes.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400 dark:text-gray-500">
        <p className="text-lg font-medium">Nenhuma indicação ainda</p>
        <p className="text-sm mt-1">
          Compartilhe seu link para começar a ganhar meses grátis!
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-zinc-800">
            <th className="py-3 px-4 font-medium">Empresa Indicada</th>
            <th className="py-3 px-4 font-medium">Data do Cadastro</th>
            <th className="py-3 px-4 font-medium">Status</th>
            <th className="py-3 px-4 font-medium">Recompensa</th>
          </tr>
        </thead>
        <tbody>
          {conversoes.map((c) => (
            <tr
              key={c.id}
              className="border-b border-gray-100 dark:border-zinc-800/50 hover:bg-gray-50 dark:hover:bg-zinc-900/50 transition-colors"
            >
              <td className="py-3 px-4 font-medium text-gray-800 dark:text-gray-200">
                {c.novaEmpresa.nome}
              </td>
              <td className="py-3 px-4 text-gray-500 dark:text-gray-400">
                {format(new Date(c.criadoEm), "dd/MM/yyyy", { locale: ptBR })}
              </td>
              <td className="py-3 px-4">
                {c.status === "PAGO" ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                    ✅ Assinante
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                    ⏳ Em Trial
                  </span>
                )}
              </td>
              <td className="py-3 px-4">
                {c.mesGratisGerado ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                    🎁 +1 Mês Grátis
                  </span>
                ) : c.status === "PAGO" ? (
                  <span className="text-xs text-gray-400">Processando...</span>
                ) : (
                  <span className="text-xs text-gray-400">
                    Aguardando assinatura
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
