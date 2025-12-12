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
import { Switch } from "@/components/ui/switch";
import { ArrowRightLeft, Smartphone, Banknote, Info } from "lucide-react";
import { parseCurrency } from "@/lib/utils";

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
  // Novas props para Troca PIX
  allowTrocaPix?: boolean;
  isTrocaPix?: boolean;
  setIsTrocaPix?: (value: boolean) => void;
  trocaPixTrocoValue?: string;
  setTrocaPixTrocoValue?: (value: string) => void;
  onConfirmTrocaPix?: () => void;
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
  // Novas props para Troca PIX
  allowTrocaPix = false,
  isTrocaPix = false,
  setIsTrocaPix,
  trocaPixTrocoValue = "",
  setTrocaPixTrocoValue,
  onConfirmTrocaPix,
}: TransactionDialogProps) {
  const sanitizeValue = (value: string) => value.replace(/[^0-9.,]/g, "");

  // Cálculos para modo Troca PIX
  const maquininhaNum = parseCurrency(inputValue) || 0;
  const trocoNum = parseCurrency(trocaPixTrocoValue) || 0;
  const taxa = maquininhaNum > trocoNum ? maquininhaNum - trocoNum : 0;

  const handleConfirm = () => {
    if (isTrocaPix && onConfirmTrocaPix) {
      onConfirmTrocaPix();
    } else {
      onConfirm();
    }
  };

  // Validação do botão
  const isButtonDisabled = () => {
    if (processing) return true;
    if (!inputValue) return true;
    if (isTrocaPix && !trocaPixTrocoValue) return true;
    return false;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isTrocaPix && (
              <ArrowRightLeft className="h-5 w-5 text-purple-500" />
            )}
            {isTrocaPix ? "Troca PIX" : title}
          </DialogTitle>
          <DialogDescription>
            {isTrocaPix
              ? "Registre quando um cliente faz PIX e recebe troco em dinheiro."
              : description}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {/* Toggle Troca PIX - só aparece quando permitido */}
          {allowTrocaPix && (
            <div className="flex items-center justify-between p-3 rounded-lg border bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800">
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                <Label
                  htmlFor="troca-pix-toggle"
                  className="text-sm font-medium text-purple-700 dark:text-purple-300 cursor-pointer"
                >
                  É Troca PIX?
                </Label>
              </div>
              <Switch
                id="troca-pix-toggle"
                checked={isTrocaPix}
                onCheckedChange={setIsTrocaPix}
                className="data-[state=checked]:bg-purple-600"
              />
            </div>
          )}

          {/* Info Box - só aparece no modo Troca PIX */}
          {isTrocaPix && (
            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-900/30">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5" />
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  <strong>Como funciona:</strong> Cliente paga um valor no PIX e
                  você dá o troco em dinheiro. A diferença é sua taxa.
                </p>
              </div>
            </div>
          )}

          {/* Campo de Valor - muda label no modo Troca PIX */}
          <div className="grid gap-2">
            <Label className="flex items-center gap-2">
              {isTrocaPix && <Smartphone className="h-4 w-4 text-green-600" />}
              {isTrocaPix ? "Valor recebido no PIX (Maquininha)" : "Valor (R$)"}
            </Label>
            <Input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(sanitizeValue(e.target.value))}
              placeholder={isTrocaPix ? "Ex: 115,00" : "0,00"}
              inputMode="decimal"
              className={isTrocaPix ? "text-lg font-medium" : ""}
            />
            {isTrocaPix && (
              <p className="text-[10px] text-muted-foreground">
                Valor que o cliente pagou no PIX
              </p>
            )}
          </div>

          {/* Campo de Troco - só aparece no modo Troca PIX */}
          {isTrocaPix && (
            <div className="grid gap-2">
              <Label className="flex items-center gap-2">
                <Banknote className="h-4 w-4 text-red-600" />
                Troco dado em dinheiro
              </Label>
              <Input
                type="text"
                value={trocaPixTrocoValue}
                onChange={(e) =>
                  setTrocaPixTrocoValue?.(sanitizeValue(e.target.value))
                }
                placeholder="Ex: 100,00"
                inputMode="decimal"
                className="text-lg font-medium"
              />
              <p className="text-[10px] text-muted-foreground">
                Valor em dinheiro que você deu pro cliente
              </p>
            </div>
          )}

          {/* Resumo da Operação - só no modo Troca PIX */}
          {isTrocaPix && (maquininhaNum > 0 || trocoNum > 0) && (
            <div className="bg-gray-50 dark:bg-zinc-800 p-3 rounded-lg border dark:border-zinc-700">
              <p className="text-xs font-medium text-muted-foreground mb-2">
                Resumo da operação:
              </p>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-green-600 dark:text-green-400">
                    + Entrada PIX:
                  </span>
                  <span className="font-medium">
                    R$ {maquininhaNum.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-red-600 dark:text-red-400">
                    - Saída Dinheiro:
                  </span>
                  <span className="font-medium">R$ {trocoNum.toFixed(2)}</span>
                </div>
                <hr className="my-1 border-gray-200 dark:border-zinc-600" />
                <div className="flex justify-between font-bold">
                  <span className="text-purple-600 dark:text-purple-400">
                    = Sua Taxa:
                  </span>
                  <span>R$ {taxa.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Forma de Pagamento - escondido no modo Troca PIX */}
          {showPaymentMethod && !isTrocaPix && (
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

          {/* Descrição - escondido no modo Troca PIX */}
          {!isTrocaPix && (
            <div className="grid gap-2">
              <Label>Descrição</Label>
              <Input
                value={descriptionValue}
                onChange={(e) => setDescriptionValue(e.target.value)}
                placeholder="Ex: Troco inicial, retirada..."
              />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={processing}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isButtonDisabled()}
            className={
              isTrocaPix ? "bg-purple-600 hover:bg-purple-700 text-white" : ""
            }
          >
            {processing
              ? isTrocaPix
                ? "Registrando..."
                : processingLabel
              : isTrocaPix
              ? "Confirmar Troca"
              : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
