import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  processingLabel: string;
  onConfirm: () => void;
  processing: boolean;
  inputValue: string;
  setInputValue: (value: string) => void;
  descriptionValue: string;
  setDescriptionValue: (value: string) => void;
  paymentMethod: string;
  setPaymentMethod: (value: string) => void;
  showPaymentMethod?: boolean;
}

export function TransactionDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  processingLabel,
  onConfirm,
  processing,
  inputValue,
  setInputValue,
  descriptionValue,
  setDescriptionValue,
  paymentMethod,
  setPaymentMethod,
  showPaymentMethod = true,
}: TransactionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>Valor (R$)</Label>
            <Input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="0,00"
              inputMode="decimal"
            />
          </div>
          {showPaymentMethod && (
            <div className="grid gap-2">
              <Label>Forma de Pagamento</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="pix">Pix</SelectItem>
                  <SelectItem value="debito">Débito</SelectItem>
                  <SelectItem value="credito">Crédito</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="grid gap-2">
            <Label>Descrição</Label>
            <Input
              value={descriptionValue}
              onChange={(e) => setDescriptionValue(e.target.value)}
              placeholder="Ex: Troco inicial, retirada..."
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={onConfirm} disabled={processing || !inputValue}>
            {processing ? processingLabel : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
