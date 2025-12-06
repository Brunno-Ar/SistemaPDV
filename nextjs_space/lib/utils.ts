import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function parseCurrency(value: string): number {
  if (!value) return 0;

  // Remove everything that is not a digit, comma, dot, or minus sign
  const cleanValue = value.replace(/[^\d.,-]/g, "");

  // Check if it's a standard float format (has dot, no comma) or just an integer
  if (!cleanValue.includes(",")) {
    const parsed = parseFloat(cleanValue);
    return isNaN(parsed) ? 0 : parsed;
  }

  // If it has a comma, assume pt-BR format (1.000,00)
  // Remove dots (thousands separators) and replace comma with dot
  const normalized = cleanValue.replace(/\./g, "").replace(",", ".");

  const parsed = parseFloat(normalized);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Extrai mensagem de erro de forma segura, sem usar 'any'
 * Use em blocos catch para obter a mensagem de erro
 *
 * @example
 * try {
 *   await fetch(...)
 * } catch (error) {
 *   const message = getErrorMessage(error);
 *   toast({ title: "Erro", description: message });
 * }
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return "Ocorreu um erro inesperado";
}
