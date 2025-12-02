"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ArrowRight } from "lucide-react";
import Link from "next/link";

interface Product {
  id: string;
  nome: string;
  estoqueAtual: number;
  estoqueMinimo: number;
  criticidade: number;
}

interface StockAlertsProps {
  products: Product[];
}

export function StockAlerts({ products }: StockAlertsProps) {
  if (!products || products.length === 0) return null;

  return (
    <Card className="border-red-200 dark:border-red-900 bg-red-50/30 dark:bg-red-900/10">
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
              className="text-red-600 hover:text-red-700 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-900/30"
            >
              Ver Tudo <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {products.map((product) => {
            const percentage = (product.estoqueAtual / product.estoqueMinimo) * 100;
            const isCritical = percentage < 50;

            return (
              <div
                key={product.id}
                className="flex items-center justify-between border-b border-red-100 dark:border-red-900/30 last:border-0 pb-3 last:pb-0"
              >
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 line-clamp-1">
                    {product.nome}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Mínimo: {product.estoqueMinimo}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge
                    variant={isCritical ? "destructive" : "secondary"}
                    className={
                      !isCritical
                        ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300"
                        : ""
                    }
                  >
                    {product.estoqueAtual} unid.
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
