"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

interface Aviso {
  id: string;
  mensagem: string;
  importante: boolean;
  lido: boolean;
  criadoEm: string;
  remetente: {
    nome: string | null;
    name: string | null;
    role: string;
  };
}

export function MuralAvisos() {
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAvisos();
  }, []);

  const fetchAvisos = async () => {
    try {
      const response = await fetch("/api/avisos");
      if (response.ok) {
        const data = await response.json();
        setAvisos(data);
      }
    } catch (error) {
      console.error("Erro ao buscar avisos", error);
    } finally {
      setLoading(false);
    }
  };

  const marcarComoLido = async (id: string) => {
    try {
      const response = await fetch(`/api/avisos/${id}/ler`, {
        method: "PUT",
      });

      if (response.ok) {
        setAvisos((prev) =>
          prev.map((aviso) =>
            aviso.id === id ? { ...aviso, lido: true } : aviso
          )
        );
        toast({
          title: "Aviso lido",
          description: "Mensagem marcada como lida.",
        });
      }
    } catch (error) {
      console.error("Erro ao marcar como lido", error);
    }
  };

  if (loading) {
    return (
      <div className="p-4 text-center text-gray-500">Carregando avisos...</div>
    );
  }

  const avisosNaoLidos = avisos.filter((a) => !a.lido);
  const avisosLidos = avisos.filter((a) => a.lido);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-blue-600" />
          Mural de Avisos
          {avisosNaoLidos.length > 0 && (
            <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
              {avisosNaoLidos.length} novos
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 max-h-[400px] overflow-y-auto">
        {avisos.length === 0 ? (
          <p className="text-center text-gray-500 py-4">
            Nenhum aviso no momento.
          </p>
        ) : (
          <>
            {avisosNaoLidos.map((aviso) => (
              <div
                key={aviso.id}
                className={`p-4 rounded-lg border ${aviso.importante
                    ? "bg-red-50 border-red-200"
                    : "bg-blue-50 border-blue-200"
                  }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span
                    className={`text-xs font-bold px-2 py-1 rounded ${aviso.importante
                        ? "bg-red-100 text-red-700"
                        : "bg-blue-100 text-blue-700"
                      }`}
                  >
                    {aviso.importante ? "IMPORTANTE" : "Aviso"}
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(aviso.criadoEm).toLocaleDateString("pt-BR")}
                  </span>
                </div>
                <p className="text-gray-800 text-sm mb-3 whitespace-pre-wrap">
                  {aviso.mensagem}
                </p>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500 font-medium">
                    De:{" "}
                    {aviso.remetente.nome ||
                      aviso.remetente.name ||
                      "Administração"}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 text-blue-600 hover:text-blue-800 hover:bg-blue-100"
                    onClick={() => marcarComoLido(aviso.id)}
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Marcar como lido
                  </Button>
                </div>
              </div>
            ))}

            {avisosLidos.length > 0 && (
              <div className="pt-4 border-t">
                <h4 className="text-sm font-medium text-gray-500 mb-2">
                  Lidos recentemente
                </h4>
                <div className="space-y-2 opacity-70">
                  {avisosLidos.slice(0, 3).map((aviso) => (
                    <div
                      key={aviso.id}
                      className="p-3 rounded-lg border bg-gray-50"
                    >
                      <p className="text-gray-600 text-sm">{aviso.mensagem}</p>
                      <span className="text-xs text-gray-400 mt-1 block">
                        {new Date(aviso.criadoEm).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
