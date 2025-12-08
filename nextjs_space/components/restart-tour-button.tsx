"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useSession } from "next-auth/react";
import { toast } from "@/hooks/use-toast";
import { RotateCcw, Loader2 } from "lucide-react";
import { TOUR_RESET_EVENT } from "@/lib/events";

export function RestartTourButton() {
  const { update } = useSession();
  const [isLoading, setIsLoading] = useState(false);

  const handleRestart = async () => {
    setIsLoading(true);

    try {
      const res = await fetch("/api/user/complete-tour", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reset: true }),
      });

      if (!res.ok) throw new Error("Failed to reset tour");

      // Atualizar a sessão cliente
      await update({ tourCompleted: false });

      // Emitir evento para o OnboardingTour reagir imediatamente
      window.dispatchEvent(new CustomEvent(TOUR_RESET_EVENT));

      toast({
        title: "Tour Reiniciado",
        description: "O guia interativo será exibido em instantes...",
      });

      setIsLoading(false);
    } catch (error) {
      setIsLoading(false);
      toast({
        title: "Erro",
        description: "Não foi possível reiniciar o tour.",
        variant: "destructive",
      });
    }
  };

  return (
    <Button
      variant="outline"
      onClick={handleRestart}
      className="gap-2"
      disabled={isLoading}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <RotateCcw className="h-4 w-4" />
      )}
      {isLoading ? "Reiniciando..." : "Reiniciar Tour de Boas-vindas"}
    </Button>
  );
}
