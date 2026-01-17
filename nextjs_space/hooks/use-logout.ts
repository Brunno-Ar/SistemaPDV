"use client";

import { signOut } from "next-auth/react";
import { toast } from "@/hooks/use-toast";
import { useCallback, useState } from "react";

export function useLogout() {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const performLogout = useCallback(
    async (redirectUrl: string = "/login") => {
      if (isLoggingOut) return;
      setIsLoggingOut(true);

      try {
        // 1. Verificar Status do Caixa
        const resStatus = await fetch("/api/caixa", { cache: "no-store" });
        if (resStatus.ok) {
          const dataStatus = await resStatus.json();

          if (dataStatus.caixaAberto) {
            // Caixa está aberto. Tentar fechamento automático seguro.
            // Primeiro, "conferir" para pegar os valores do sistema
            const resConf = await fetch("/api/caixa", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "conferir" }),
            });

            if (resConf.ok) {
              const dataConf = await resConf.json();

              if (dataConf.success && dataConf.detalhes) {
                const { dinheiro, maquininha } = dataConf.detalhes.esperado;

                // Fechar usando valores do sistema (diferença zero)
                // Adicionamos justificativa automática
                await fetch("/api/caixa", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    action: "fechar",
                    valorInformadoDinheiro: dinheiro,
                    valorInformadoMaquininha: maquininha,
                    justificativa: "Fechamento Automático por Logout",
                  }),
                });

                toast({
                  title: "Caixa Fechado",
                  description: "Seu caixa foi fechado automaticamente.",
                });
              }
            }
          }
        }
      } catch (error) {
        console.error("Erro ao tentar fechar caixa no logout:", error);
        // Não impede o logout se der erro (internet caiu, etc), para não prender o usuário
      } finally {
        // Sempre faz o logout, mesmo se falhar o fechamento
        await signOut({ callbackUrl: redirectUrl });
      }
    },
    [isLoggingOut]
  );

  return { performLogout, isLoggingOut };
}
