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
  // Remove everything that is not a digit or a comma/dot
  const cleanValue = value.replace(/[^\d.,]/g, "");

  // If it has a comma, it might be using comma as decimal separator
  // We assume pt-BR format where dot is thousands separator and comma is decimal
  // Example: 1.000,00 -> 1000.00
  // Example: 10,50 -> 10.50

  // Replace dots with empty string (thousands separator)
  // Replace comma with dot (decimal separator)
  const normalized = cleanValue.replace(/\./g, "").replace(",", ".");

  const parsed = parseFloat(normalized);
  return isNaN(parsed) ? 0 : parsed;
}
