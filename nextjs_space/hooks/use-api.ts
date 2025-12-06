"use client";

import { useState, useCallback } from "react";
import { toast } from "@/hooks/use-toast";
import { ApiResponse } from "@/lib/types";

interface UseApiOptions {
  showSuccessToast?: boolean;
  showErrorToast?: boolean;
  successMessage?: string;
}

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/**
 * Hook para fazer requisições de API com tratamento de loading, erro e toast padronizados
 *
 * @example
 * const { data, loading, error, execute } = useApi<Product[]>();
 *
 * // Uso
 * await execute(() => fetch("/api/products").then(r => r.json()));
 */
export function useApi<T>(options: UseApiOptions = {}) {
  const {
    showSuccessToast = false,
    showErrorToast = true,
    successMessage = "Operação realizada com sucesso!",
  } = options;

  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const execute = useCallback(
    async (
      apiCall: () => Promise<T | ApiResponse<T>>,
      customSuccessMessage?: string
    ): Promise<T | null> => {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const result = await apiCall();

        // Verifica se é uma ApiResponse padrão
        if (
          result &&
          typeof result === "object" &&
          "success" in result &&
          result.success === false
        ) {
          throw new Error(
            (result as ApiResponse<T>).error || "Erro desconhecido"
          );
        }

        // Extrai data se for ApiResponse, senão usa o resultado direto
        const data =
          result && typeof result === "object" && "data" in result
            ? (result as ApiResponse<T>).data!
            : (result as T);

        setState({ data, loading: false, error: null });

        if (showSuccessToast) {
          toast({
            title: "Sucesso",
            description: customSuccessMessage || successMessage,
          });
        }

        return data;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Erro desconhecido";

        setState({ data: null, loading: false, error: errorMessage });

        if (showErrorToast) {
          toast({
            title: "Erro",
            description: errorMessage,
            variant: "destructive",
          });
        }

        return null;
      }
    },
    [showSuccessToast, showErrorToast, successMessage]
  );

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  return {
    ...state,
    execute,
    reset,
    isLoading: state.loading,
    isError: !!state.error,
    isSuccess: !!state.data && !state.error,
  };
}

/**
 * Hook simplificado para requisições GET
 */
export function useGet<T>(url: string, options: UseApiOptions = {}) {
  const api = useApi<T>(options);

  const fetch = useCallback(async () => {
    return api.execute(async () => {
      const response = await window.fetch(url);
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || `Erro ${response.status}`);
      }
      return response.json();
    });
  }, [url, api]);

  return { ...api, fetch };
}

/**
 * Hook simplificado para requisições POST
 */
export function usePost<T, B = unknown>(
  url: string,
  options: UseApiOptions = {}
) {
  const api = useApi<T>({ showSuccessToast: true, ...options });

  const post = useCallback(
    async (body: B) => {
      return api.execute(async () => {
        const response = await window.fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error || `Erro ${response.status}`);
        }
        return response.json();
      });
    },
    [url, api]
  );

  return { ...api, post };
}

/**
 * Hook simplificado para requisições DELETE
 */
export function useDelete<T>(options: UseApiOptions = {}) {
  const api = useApi<T>({ showSuccessToast: true, ...options });

  const remove = useCallback(
    async (url: string) => {
      return api.execute(async () => {
        const response = await window.fetch(url, { method: "DELETE" });
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error || `Erro ${response.status}`);
        }
        return response.json();
      });
    },
    [api]
  );

  return { ...api, remove };
}
