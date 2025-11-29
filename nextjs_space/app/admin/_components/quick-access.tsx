import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InteractiveHoverButton } from "@/components/ui/interactive-hover-button";
import { Package, ShoppingCart, Calendar } from "lucide-react";
import Link from "next/link";

export function QuickAccess() {
  return (
    <Card className="bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800">
      <CardHeader>
        <CardTitle className="text-gray-900 dark:text-gray-100">
          Acesso Rápido
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href="/vender">
            <InteractiveHoverButton className="w-full h-24 text-lg border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-gray-50 dark:hover:bg-zinc-800 text-gray-900 dark:text-gray-100">
              <span className="flex flex-col items-center justify-center gap-2">
                <ShoppingCart className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                <span>Nova Venda</span>
              </span>
            </InteractiveHoverButton>
          </Link>
          <Link href="/estoque">
            <InteractiveHoverButton className="w-full h-24 text-lg border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-gray-50 dark:hover:bg-zinc-800 text-gray-900 dark:text-gray-100">
              <span className="flex flex-col items-center justify-center gap-2">
                <Package className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                <span>Gerenciar Estoque</span>
              </span>
            </InteractiveHoverButton>
          </Link>
          <Link href="/relatorios">
            <InteractiveHoverButton className="w-full h-24 text-lg border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-gray-50 dark:hover:bg-zinc-800 text-gray-900 dark:text-gray-100">
              <span className="flex flex-col items-center justify-center gap-2">
                <Calendar className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                <span>Relatórios</span>
              </span>
            </InteractiveHoverButton>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
