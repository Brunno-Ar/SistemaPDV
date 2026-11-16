"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RefreshCw, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface SyncResult {
  total: number;
  vinculadas: number;
  semCadastro: number;
  updated: number;
  pendentes: number;
  errors: number;
  timeout?: boolean;
  parcial?: boolean;
  details: Array<{
    empresa: string;
    status: string;
    oldStatus?: string;
    newStatus?: string;
    error?: string;
    pendencia?: string;
  }>;
}

export function SyncPanel() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SyncResult | null>(null);

  const handleSyncAll = async () => {
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/master/sync-all", {
        method: "POST",
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setResult({
          total: data.total,
          vinculadas: data.vinculadas ?? 0,
          semCadastro: data.semCadastro ?? 0,
          updated: data.updated,
          pendentes: data.pendentes,
          errors: data.errors,
          timeout: data.timeout,
          parcial: data.parcial,
          details: data.details ?? [],
        });
        toast.success(
          `Sincronização concluída: ${data.updated} atualizada(s), ${data.semCadastro} sem cadastro no Asaas, ${data.pendentes} pendente(s), ${data.errors} erro(s).`,
        );
      } else {
        throw new Error(data.error || "Erro ao sincronizar");
      }
    } catch (error) {
      toast.error("Erro ao sincronizar", {
        description:
          error instanceof Error ? error.message : "Erro desconhecido",
      });
    } finally {
      setLoading(false);
    }
  };

  const empresasSemCadastro = result?.details.filter(
    (d) => d.status === "sem_cadastro",
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5" />
          Sincronia Financeira Global
        </CardTitle>
        <CardDescription>
          Verifica o status de todas as assinaturas vinculadas ao Asaas e
          atualiza o banco de dados local. Empresas sem cadastro no Asaas são
          apenas listadas — nenhuma assinatura é criada aqui.
          Use isso periodicamente para garantir consistência.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          onClick={handleSyncAll}
          disabled={loading}
          className="w-full sm:w-auto"
          size="lg"
        >
          {loading ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Sincronizando... Isso pode levar alguns segundos
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Sincronizar Todas as Empresas
            </>
          )}
        </Button>

        {result && (
          <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-top-2">
            <Alert
              variant={result.errors > 0 ? "destructive" : "default"}
              className={
                result.errors === 0 && result.pendentes === 0
                  ? "border-green-500 bg-green-50 text-green-900"
                  : ""
              }
            >
              {result.errors === 0 && result.pendentes === 0 ? (
                <div className="flex items-center gap-2">
                  <span className="h-4 w-4 text-green-500">✓</span>
                </div>
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <AlertTitle>Resultado da Sincronização</AlertTitle>
              <AlertDescription>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm mb-2">
                  <div>
                    <span className="block text-gray-500">Vinculadas</span>
                    <span className="font-semibold">{result.vinculadas}</span>
                  </div>
                  <div>
                    <span className="block text-gray-500">Atualizadas</span>
                    <span className="font-semibold text-green-600">{result.updated}</span>
                  </div>
                  <div>
                    <span className="block text-gray-500">Sem cadastro</span>
                    <span className="font-semibold text-blue-600">{result.semCadastro}</span>
                  </div>
                  <div>
                    <span className="block text-gray-500">Pendentes</span>
                    <span className="font-semibold text-yellow-600">{result.pendentes}</span>
                  </div>
                  <div>
                    <span className="block text-gray-500">Erros</span>
                    <span className="font-semibold text-red-600">{result.errors}</span>
                  </div>
                </div>
                {result.timeout && (
                  <p className="text-xs text-yellow-600 mt-1">
                    Sincronização parcial (limite de tempo atingido).
                  </p>
                )}
              </AlertDescription>
            </Alert>

            {empresasSemCadastro?.length > 0 && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-900/10 dark:border-blue-800/30 p-3">
                <AlertTitle className="text-sm font-semibold text-blue-800 dark:text-blue-300 flex items-center gap-1">
                  <span className="h-3 w-3 text-blue-600">i</span>
                  Sem cadastro no Asaas (não provisionadas)
                </AlertTitle>
                <ul className="list-disc list-inside text-xs text-blue-600 dark:text-blue-300 mt-1 space-y-0.5">
                  {empresasSemCadastro.map((d) => (
                    <li key={d.empresa}>{d.empresa}</li>
                  ))}
                </ul>
                <p className="text-xs text-blue-600 dark:text-blue-300 mt-2">
                  Use o menu por empresa → "Sincronizar Asaas" para revisar e,
                      se aplicável, provisionar individualmente.
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
