import { Badge } from "@/components/ui/badge";
import { InteractiveHoverButton } from "@/components/ui/interactive-hover-button";
import { AlertTriangle, Calendar } from "lucide-react";
import Link from "next/link";

interface Product {
  id: string;
  nome: string;
  sku: string;
  estoqueAtual: number;
  estoqueMinimo: number;
}

interface LoteVencimento {
  id: string;
  numeroLote: string;
  dataValidade: string;
  quantidade: number;
  produto: {
    nome: string;
    sku: string;
  };
}

interface StockAlertsProps {
  produtosEstoqueBaixo: Product[];
  lotesVencimentoProximo: LoteVencimento[];
}

export function StockAlerts({
  produtosEstoqueBaixo,
  lotesVencimentoProximo,
}: StockAlertsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Alertas de Estoque Baixo */}
      {produtosEstoqueBaixo.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
            <h3 className="text-lg font-semibold text-red-900 dark:text-red-200">
              Estoque Baixo ({produtosEstoqueBaixo.length})
            </h3>
          </div>
          <div className="space-y-2">
            {produtosEstoqueBaixo.slice(0, 3).map((produto) => (
              <div
                key={produto.id}
                className="flex items-center justify-between bg-white dark:bg-zinc-900 p-3 rounded-lg border border-red-100 dark:border-red-900/20"
              >
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {produto.nome}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    SKU: {produto.sku}
                  </p>
                </div>
                <Badge variant="destructive">
                  {produto.estoqueAtual} / {produto.estoqueMinimo} un.
                </Badge>
              </div>
            ))}
            {produtosEstoqueBaixo.length > 3 && (
              <Link href="/estoque?filter=low_stock">
                <InteractiveHoverButton className="w-full mt-2 bg-white hover:bg-red-50 dark:bg-zinc-900 dark:hover:bg-red-900/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-900/30">
                  Ver todos
                </InteractiveHoverButton>
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Alertas de Vencimento Próximo */}
      {lotesVencimentoProximo.length > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-900/30 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            <h3 className="text-lg font-semibold text-yellow-900 dark:text-yellow-200">
              Vencimento Próximo ({lotesVencimentoProximo.length})
            </h3>
          </div>
          <div className="space-y-2">
            {lotesVencimentoProximo.slice(0, 3).map((lote) => {
              const diasParaVencer = Math.ceil(
                (new Date(lote.dataValidade).getTime() - new Date().getTime()) /
                  (1000 * 60 * 60 * 24)
              );
              return (
                <div
                  key={lote.id}
                  className="flex items-center justify-between bg-white dark:bg-zinc-900 p-3 rounded-lg border border-yellow-100 dark:border-yellow-900/20"
                >
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      {lote.produto.nome}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Vence em:{" "}
                      {new Date(lote.dataValidade).toLocaleDateString("pt-BR")}{" "}
                      (<strong>{diasParaVencer} dias</strong>)
                    </p>
                  </div>
                  <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300">
                    {lote.quantidade} un.
                  </Badge>
                </div>
              );
            })}
            {lotesVencimentoProximo.length > 3 && (
              <Link href="/lotes">
                <InteractiveHoverButton className="w-full mt-2 bg-white hover:bg-yellow-50 dark:bg-zinc-900 dark:hover:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-900/30">
                  Ver todos
                </InteractiveHoverButton>
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
