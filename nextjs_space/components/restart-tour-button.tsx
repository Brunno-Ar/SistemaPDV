"use client";

import { Button } from "@/components/ui/button";
import { useSession } from "next-auth/react";
import { toast } from "@/components/ui/use-toast";
import { RotateCcw } from "lucide-react";

export function RestartTourButton() {
  const { update } = useSession();

  const handleRestart = async () => {
    try {
      const res = await fetch("/api/user/complete-tour", {
        method: "PUT", // Using PUT to reset
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reset: true }),
      });

      if (!res.ok) throw new Error("Failed to reset tour");

      await update({ tourCompleted: false });

      toast({
        title: "Tour Reiniciado",
        description: "O guia interativo será exibido novamente.",
      });

      // Reload to trigger the tour component again if needed, or state update might be enough
      window.location.reload();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível reiniciar o tour.",
        variant: "destructive",
      });
    }
  };

  return (
    <Button variant="outline" onClick={handleRestart} className="gap-2">
      <RotateCcw className="h-4 w-4" />
      Reiniciar Tour de Boas-vindas
    </Button>
  );
}
