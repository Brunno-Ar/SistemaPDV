import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { InteractiveHoverButton } from "@/components/ui/interactive-hover-button";

interface AvisoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedEmpresa: any;
  avisoData: any;
  setAvisoData: (data: any) => void;
  handleCriarAviso: () => void;
}

export function AvisoDialog({
  open,
  onOpenChange,
  selectedEmpresa,
  avisoData,
  setAvisoData,
  handleCriarAviso,
}: AvisoDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Criar Aviso para: {selectedEmpresa?.nome}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="mensagem">Mensagem</Label>
            <Textarea
              id="mensagem"
              value={avisoData.mensagem}
              onChange={(e) =>
                setAvisoData({ ...avisoData, mensagem: e.target.value })
              }
              placeholder="Digite o aviso..."
              rows={4}
            />
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="importante"
              checked={avisoData.importante}
              onChange={(e) =>
                setAvisoData({ ...avisoData, importante: e.target.checked })
              }
            />
            <Label htmlFor="importante">Marcar como importante</Label>
          </div>
          <InteractiveHoverButton
            onClick={handleCriarAviso}
            className="w-full bg-primary text-primary-foreground border-primary hover:bg-primary/90"
          >
            Criar Aviso
          </InteractiveHoverButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}
