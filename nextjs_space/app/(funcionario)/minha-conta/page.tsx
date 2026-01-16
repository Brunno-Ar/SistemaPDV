"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MuralAvisos } from "@/components/mural-avisos";
import { formatCurrency } from "@/lib/utils";
import { RestartTourButton } from "@/components/restart-tour-button";

interface Sale {
  id: string;
  valorTotal: number;
  createdAt: string;
}

export default function MinhaContaPage() {
  const { data: session } = useSession();
  const [sales, setSales] = useState<Sale[]>([]);
  const [salesMonth, setSalesMonth] = useState(0);
  const [metaMensal, setMetaMensal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSales() {
      try {
        const res = await fetch("/api/employee/analytics");
        if (res.ok) {
          const json = await res.json();
          setSales(json.lastSales || []);
          setSalesMonth(json.salesMonth || 0);
          setMetaMensal(json.metaMensal || 0);
        }
      } catch (error) {
        console.error("Failed to fetch sales", error);
      } finally {
        setLoading(false);
      }
    }
    fetchSales();
  }, []);

  const calculateProgress = () => {
    if (metaMensal === 0) return 0;
    return Math.min((salesMonth / metaMensal) * 100, 100);
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Minhas Vendas
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Acompanhe seu desempenho e histórico de vendas.
          </p>
        </div>
        <RestartTourButton />
      </div>

      {/* Meta e Progresso */}
      {session?.user?.role !== "admin" && session?.user?.role !== "master" && (
        <Card className="bg-gradient-to-br from-blue-600 to-blue-700 border-none shadow-lg rounded-xl text-white overflow-hidden relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
          <CardContent className="p-6 relative z-10">
            <div className="flex justify-between items-end mb-4">
              <div>
                <p className="text-blue-100 text-sm font-medium mb-1">
                  Vendas no Mês
                </p>
                <h2 className="text-3xl font-bold">
                  {formatCurrency(salesMonth)}
                </h2>
              </div>
              <div className="text-right">
                <p className="text-blue-100 text-sm font-medium mb-1">
                  Meta Mensal
                </p>
                <p className="text-xl font-semibold">
                  {formatCurrency(metaMensal)}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs font-medium text-blue-100">
                <span>Progresso</span>
                <span>
                  {((salesMonth / (metaMensal || 1)) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="h-3 bg-black/20 rounded-full overflow-hidden backdrop-blur-sm">
                <div
                  className="h-full bg-white rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${calculateProgress()}%` }}
                ></div>
              </div>
              <p className="text-xs text-blue-200 mt-2">
                {salesMonth >= metaMensal
                  ? "Parabéns! Você atingiu sua meta mensal! 🚀"
                  : `Faltam ${formatCurrency(
                      metaMensal - salesMonth,
                    )} para atingir sua meta.`}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

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
          {sales.length === 0 ? (
            <div className="py-8 text-center text-gray-500">
              Nenhuma venda registrada recentemente.
            </div>
          ) : (
            <>
              {/* Mobile: Card Layout */}
              <div className="md:hidden space-y-3">
                {sales.map((sale) => (
                  <div
                    key={sale.id}
                    className="p-4 bg-gray-50 dark:bg-zinc-800 rounded-lg"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {new Date(sale.createdAt).toLocaleDateString(
                              "pt-BR",
                            )}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(sale.createdAt).toLocaleTimeString(
                              "pt-BR",
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                              },
                            )}
                          </p>
                        </div>
                      </div>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                        Concluída
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <p className="text-xs text-gray-500 font-mono">
                        ID: {sale.id.substring(0, 8)}...
                      </p>
                      <p className="font-bold text-lg text-gray-900 dark:text-white">
                        {formatCurrency(sale.valorTotal)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop: Table Layout */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                    <tr>
                      <th className="px-4 py-3 rounded-l-lg">Data/Hora</th>
                      <th className="px-4 py-3">ID da Venda</th>
                      <th className="px-4 py-3">Valor</th>
                      <th className="px-4 py-3 rounded-r-lg text-right">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sales.map((sale) => (
                      <tr
                        key={sale.id}
                        className="border-b border-gray-100 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                      >
                        <td className="px-4 py-4 font-medium text-gray-900 dark:text-white flex items-center gap-2">
                          <Clock className="h-4 w-4 text-gray-400" />
                          <div className="flex flex-col">
                            <span>
                              {new Date(sale.createdAt).toLocaleDateString(
                                "pt-BR",
                              )}
                            </span>
                            <span className="text-xs text-gray-500">
                              {new Date(sale.createdAt).toLocaleTimeString(
                                "pt-BR",
                                {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                },
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
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
