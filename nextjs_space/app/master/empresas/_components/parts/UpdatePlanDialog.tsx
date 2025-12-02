import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { InteractiveHoverButton } from "@/components/ui/interactive-hover-button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import { Empresa } from "./types";

interface UpdatePlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  empresa: Empresa;
  onUpdate: (data: { date: Date; diaVencimento?: number }) => void;
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
  const [diaVencimento, setDiaVencimento] = useState<number>(
    empresa.diaVencimento || 10
  );
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!date) return;
    setLoading(true);

    // Fix: Create date using local time components to avoid timezone shifts
    // "2026-03-01" -> new Date(2026, 2, 1, 12, 0, 0) -> March 1st 12:00 Local
    const [year, month, day] = date.split("-").map(Number);
    const newDate = new Date(year, month - 1, day, 12, 0, 0);

    onUpdate({ date: newDate, diaVencimento });
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Renovação e Plano - {empresa.nome}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="vencimento">
              Data Limite Atual (Renovação Manual)
            </Label>
            <Input
              id="vencimento"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              O acesso será bloqueado automaticamente 3 dias após esta data.
            </p>
          </div>

          <div>
            <Label htmlFor="diaVencimento">
              Dia de Vencimento (Referência)
            </Label>
            <Select
              value={String(diaVencimento)}
              onValueChange={(value) => setDiaVencimento(parseInt(value))}
            >
              <SelectTrigger id="diaVencimento">
                <SelectValue placeholder="Selecione o dia" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                  <SelectItem key={day} value={String(day)}>
                    Dia {day}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              Dia padrão para cobrança mensal.
            </p>
          </div>

          <InteractiveHoverButton
            type="submit"
            className="w-full bg-blue-600 text-white hover:bg-blue-700 border-blue-600"
            disabled={loading}
          >
            {loading ? "Atualizando..." : "Salvar Alterações"}
          </InteractiveHoverButton>
        </form>
      </DialogContent>
    </Dialog>
  );
}
