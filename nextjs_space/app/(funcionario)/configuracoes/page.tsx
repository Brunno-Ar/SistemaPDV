"use client";

import { ThemeToggle } from "@/components/theme-toggle";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export default function ConfiguracoesPage() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="flex flex-col gap-6 p-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
        Configurações
      </h1>

      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 p-6 max-w-md shadow-sm">
        <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
          Aparência
        </h2>

        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Tema do Sistema
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Tema atual: {resolvedTheme === "dark" ? "Escuro" : "Claro"}
            </span>
          </div>

          <ThemeToggle />
        </div>
      </div>
    </div>
  );
}
