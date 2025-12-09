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
import { RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function SyncPanel() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    total: number;
    updated: number;
    errors: number;
  } | null>(null);

  const handleSyncAll = async () => {
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/master/sync-all", {
        method: "POST",
      });

      const data = await res.json();

      if (res.ok) {
        setResult({
          total: data.total,
          updated: data.updated,
          errors: data.errors,
        });
        toast.success("Sincronização em massa concluída!");
      } else {
        throw new Error(data.error);
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5" />
          Sincronia Financeira Global
        </CardTitle>
        <CardDescription>
          Verifica o status de todas as assinaturas no Asaas e atualiza o banco
          de dados local. Use isso periodicamente para garantir consistência.
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
                result.errors === 0
                  ? "border-green-500 bg-green-50 text-green-900"
                  : ""
              }
            >
              {result.errors === 0 ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <AlertTitle>Resultado da Sincronização</AlertTitle>
              <AlertDescription>
                Processado: <strong>{result.total}</strong> empresas. <br />
                Atualizado com sucesso: <strong>{result.updated}</strong>.{" "}
                <br />
                Falhas: <strong>{result.errors}</strong>.
              </AlertDescription>
            </Alert>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
