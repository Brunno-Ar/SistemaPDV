import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { InteractiveHoverButton } from "@/components/ui/interactive-hover-button";
import { useState } from "react";
import { Empresa } from "./types";

interface UpdatePlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  empresa: Empresa;
  onUpdate: (date: Date) => void;
}

export function UpdatePlanDialog({
  open,
  onOpenChange,
  empresa,
  onUpdate,
}: UpdatePlanDialogProps) {
  const [date, setDate] = useState<string>(
    empresa.vencimentoPlano ? empresa.vencimentoPlano.split("T")[0] : ""
  );
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!date) return;
    setLoading(true);
    // Create Date object from input (assuming local time, adjusting for timezone if needed but simpler for MVP)
    const newDate = new Date(date);
    // Adjust to end of day? Or just date?
    // Let's assume standard date.
    onUpdate(newDate);
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Atualizar Plano - {empresa.nome}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="vencimento">Nova Data de Vencimento</Label>
            <Input
              id="vencimento"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>
          <InteractiveHoverButton
            type="submit"
            className="w-full bg-blue-600 text-white hover:bg-blue-700 border-blue-600"
            disabled={loading}
          >
            {loading ? "Atualizando..." : "Salvar Data"}
          </InteractiveHoverButton>
        </form>
      </DialogContent>
    </Dialog>
  );
}
