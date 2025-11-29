"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Clock, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MuralAvisos } from "@/components/mural-avisos";

interface Sale {
  id: string;
  valorTotal: number;
  createdAt: string;
}

export default function MinhaContaPage() {
  const { data: session } = useSession();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSales() {
      try {
        // Reusing the analytics API but we only need the lastSales part
        // In a real app, we might want a dedicated endpoint for sales history with pagination
        const res = await fetch("/api/employee/analytics");
        if (res.ok) {
          const json = await res.json();
          setSales(json.lastSales || []);
        }
      } catch (error) {
        console.error("Failed to fetch sales", error);
      } finally {
        setLoading(false);
      }
    }
    fetchSales();
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-4 space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Minhas Vendas
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          Histórico recente de vendas realizadas por você.
        </p>
      </div>

      <div className="mb-6">
        <MuralAvisos />
      </div>

      <Card className="bg-white dark:bg-zinc-900 border-none shadow-sm rounded-xl">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
            Últimas Vendas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <tr>
                  <th className="px-4 py-3 rounded-l-lg">Data/Hora</th>
                  <th className="px-4 py-3">ID da Venda</th>
                  <th className="px-4 py-3">Valor</th>
                  <th className="px-4 py-3 rounded-r-lg text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {sales.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-8 text-center text-gray-500"
                    >
                      Nenhuma venda registrada recentemente.
                    </td>
                  </tr>
                ) : (
                  sales.map((sale) => (
                    <tr
                      key={sale.id}
                      className="border-b border-gray-100 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                    >
                      <td className="px-4 py-4 font-medium text-gray-900 dark:text-white flex items-center gap-2">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <div className="flex flex-col">
                          <span>
                            {new Date(sale.createdAt).toLocaleDateString(
                              "pt-BR"
                            )}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(sale.createdAt).toLocaleTimeString(
                              "pt-BR",
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-gray-500 font-mono text-xs">
                        {sale.id.substring(0, 8)}...
                      </td>
                      <td className="px-4 py-4 font-bold text-gray-900 dark:text-white">
                        {formatCurrency(sale.valorTotal)}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                          Concluída
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
