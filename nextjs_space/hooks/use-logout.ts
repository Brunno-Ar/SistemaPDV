"use client";

import { signOut } from "next-auth/react";
import { useCallback, useState } from "react";

/**
 * Hook para gerenciar o logout do sistema.
 * Removida a lógica de fechamento automático de caixa conforme solicitação.
 */
export function useLogout() {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const logout = useCallback(
    async (redirectUrl: string = "/login") => {
      if (isLoggingOut) return;
      setIsLoggingOut(true);

      try {
        await signOut({ callbackUrl: redirectUrl });
      } catch (error) {
        console.error("Erro ao fazer logout:", error);
        setIsLoggingOut(false);
      }
    },
    [isLoggingOut],
  );

  return {
    logout,
    isLoggingOut,
  };
}
