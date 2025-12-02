import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Calendar, ArrowRight } from "lucide-react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface Product {
  id: string;
  nome: string;
  sku: string;
  estoque_atual?: number;
  estoque_minimo?: number;
  deficit?: number;
  preco?: number;
  imagem_url?: string;
  criticidade?: number; // Optional as it comes from stats API now
  // Fallback for legacy prop
  estoqueAtual?: number;
  estoqueMinimo?: number;
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
  topLowStock?: Product[]; // New prop from stats API
}

export function StockAlerts({
  produtosEstoqueBaixo,
  lotesVencimentoProximo,
  topLowStock,
}: StockAlertsProps) {
  // Use topLowStock if available (new logic), otherwise fall back to old list or empty
  const displayProducts = topLowStock || produtosEstoqueBaixo.slice(0, 5);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Alertas de Estoque Baixo (Novo Card) */}
      {(displayProducts.length > 0 || produtosEstoqueBaixo.length > 0) && (
        <Card className="border-red-200 dark:border-red-900 bg-red-50/30 dark:bg-red-900/10 h-full">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2 text-red-700 dark:text-red-400">
                <AlertTriangle className="h-5 w-5" />
                Estoque Crítico
              </CardTitle>
              <Link href="/estoque?filtro=baixo">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:text-red-700 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-900/30 p-0 h-auto"
                >
                  <span className="text-xs font-semibold mr-1">Ver Tudo</span>
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>
            <CardDescription className="text-red-600/80 dark:text-red-400/80 text-xs">
              Produtos com estoque abaixo do mínimo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {displayProducts.map((produto) => {
                // Normalize keys (handle both snake_case from API and camelCase from legacy props)
                const estoqueAtual =
                  produto.estoque_atual ?? produto.estoqueAtual ?? 0;
                const estoqueMinimo =
                  produto.estoque_minimo ?? produto.estoqueMinimo ?? 1;

                const percentage =
                  estoqueMinimo > 0
                    ? (estoqueAtual / estoqueMinimo) * 100
                    : 100;
                const isCritical = percentage < 50;

                return (
                  <div
                    key={produto.id}
                    className="flex items-center justify-between border-b border-red-100 dark:border-red-900/30 last:border-0 pb-2 last:pb-0"
                  >
                    <div className="space-y-0.5 max-w-[70%]">
                      <p
                        className="text-sm font-medium text-gray-900 dark:text-gray-100 line-clamp-1"
                        title={produto.nome}
                      >
                        {produto.nome}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 flex gap-2">
                        <span>Min: {estoqueMinimo}</span>
                        {produto.deficit !== undefined && (
                          <span className="text-red-500 font-medium">
                            Falta: {produto.deficit}
                          </span>
                        )}
                      </p>
                    </div>
                    <Badge
                      variant={isCritical ? "destructive" : "secondary"}
                      className={
                        !isCritical
                          ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 whitespace-nowrap"
                          : "whitespace-nowrap"
                      }
                    >
                      {estoqueAtual} unid.
                    </Badge>
                  </div>
                );
              })}
              {displayProducts.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">
                  Nenhum produto em nível crítico.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alertas de Vencimento Próximo (Mantendo lógica existente) */}
      {lotesVencimentoProximo.length > 0 && (
        <Card className="border-yellow-200 dark:border-yellow-900 bg-yellow-50/30 dark:bg-yellow-900/10 h-full">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
                <Calendar className="h-5 w-5" />
                Vencimento Próximo
              </CardTitle>
              <Link href="/lotes">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-yellow-600 hover:text-yellow-700 hover:bg-yellow-100 dark:text-yellow-400 dark:hover:bg-yellow-900/30 p-0 h-auto"
                >
                  <span className="text-xs font-semibold mr-1">Ver Tudo</span>
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>
            <CardDescription className="text-yellow-600/80 dark:text-yellow-400/80 text-xs">
              Lotes vencendo em breve
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {lotesVencimentoProximo.slice(0, 5).map((lote) => {
                const diasParaVencer = Math.ceil(
                  (new Date(lote.dataValidade).getTime() -
                    new Date().getTime()) /
                    (1000 * 60 * 60 * 24)
                );
                return (
                  <div
                    key={lote.id}
                    className="flex items-center justify-between border-b border-yellow-100 dark:border-yellow-900/30 last:border-0 pb-2 last:pb-0"
                  >
                    <div className="space-y-0.5 max-w-[70%]">
                      <p
                        className="text-sm font-medium text-gray-900 dark:text-gray-100 line-clamp-1"
                        title={lote.produto.nome}
                      >
                        {lote.produto.nome}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Vence em {diasParaVencer} dias
                      </p>
                    </div>
                    <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 whitespace-nowrap">
                      {lote.quantidade} un.
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Add Button import that was missing in original file context if needed,
// but I used Shadcn Button in the snippet above so I need to import it.
import { Button } from "@/components/ui/button";
