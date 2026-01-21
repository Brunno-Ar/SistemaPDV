"use client";

import { signOut } from "next-auth/react";
import { toast } from "@/hooks/use-toast";
import { useCallback, useState } from "react";

interface CaixaStatus {
  caixaAberto: boolean;
  saldoInicial?: number;
}

export function useLogout() {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isCheckingCaixa, setIsCheckingCaixa] = useState(false);

  const checkCaixaStatus =
    useCallback(async (): Promise<CaixaStatus | null> => {
      setIsCheckingCaixa(true);
      try {
        const res = await fetch("/api/caixa", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          return {
            caixaAberto: !!data.caixaAberto,
            saldoInicial: data.caixaAberto?.saldoInicial,
          };
        }
        return { caixaAberto: false };
      } catch {
        return null;
      } finally {
        setIsCheckingCaixa(false);
      }
    }, []);

  const performLogoutWithClosing = useCallback(
    async (redirectUrl: string = "/login") => {
      if (isLoggingOut) return;
      setIsLoggingOut(true);

      try {
        const resStatus = await fetch("/api/caixa", { cache: "no-store" });
        if (resStatus.ok) {
          const dataStatus = await resStatus.json();

          if (dataStatus.caixaAberto) {
            const resConf = await fetch("/api/caixa", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "conferir" }),
            });

            if (resConf.ok) {
              const dataConf = await resConf.json();

              if (dataConf.success && dataConf.detalhes) {
                const { dinheiro, maquininha } = dataConf.detalhes.esperado;

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
      } finally {
        await signOut({ callbackUrl: redirectUrl });
      }
    },
    [isLoggingOut]
  );

  const performLogoutWithoutClosing = useCallback(
    async (redirectUrl: string = "/login") => {
      if (isLoggingOut) return;
      setIsLoggingOut(true);
      await signOut({ callbackUrl: redirectUrl });
    },
    [isLoggingOut]
  );

  return {
    checkCaixaStatus,
    performLogoutWithClosing,
    performLogoutWithoutClosing,
    isLoggingOut,
    isCheckingCaixa,
  };
}
