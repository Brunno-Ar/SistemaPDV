import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { InteractiveHoverButton } from "@/components/ui/interactive-hover-button";
import { Trash2 } from "lucide-react";

interface ClearDataAlertProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  empresaToClear: any;
  setEmpresaToClear: (empresa: any) => void;
  clearDataConfirmText: string;
  setClearDataConfirmText: (text: string) => void;
  handleConfirmClearData: () => void;
}

export function ClearDataAlert({
  open,
  onOpenChange,
  empresaToClear,
  setEmpresaToClear,
  clearDataConfirmText,
  setClearDataConfirmText,
  handleConfirmClearData,
}: ClearDataAlertProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Limpar Dados de Teste?</AlertDialogTitle>
          <AlertDialogDescription className="space-y-4">
            <div className="bg-orange-50 border border-orange-200 rounded p-3 text-orange-800 text-sm">
              ⚠️ <strong>Atenção:</strong> Esta ação é ideal para zerar uma
              conta após testes.
            </div>
            <p>
              Você está prestes a apagar <strong>TODAS</strong> as movimentações
              da empresa{" "}
              <strong className="text-black">{empresaToClear?.nome}</strong>.
            </p>
            <div className="space-y-2 pt-2">
              <p className="font-semibold text-sm">
                Digite{" "}
                <span className="text-red-600 font-mono">LIMPAR DADOS</span>{" "}
                abaixo para confirmar:
              </p>
              <Input
                value={clearDataConfirmText}
                onChange={(e) =>
                  setClearDataConfirmText(e.target.value.toUpperCase())
                }
                placeholder="LIMPAR DADOS"
                className="font-mono uppercase"
              />
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <InteractiveHoverButton
            className="bg-white hover:bg-gray-50 text-gray-700 border-gray-200"
            onClick={() => {
              setClearDataConfirmText("");
              setEmpresaToClear(null);
              onOpenChange(false);
            }}
          >
            Cancelar
          </InteractiveHoverButton>
          <InteractiveHoverButton
            onClick={handleConfirmClearData}
            disabled={clearDataConfirmText !== "LIMPAR DADOS"}
            className="bg-orange-600 hover:bg-orange-700 text-white border-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Limpar Tudo
          </InteractiveHoverButton>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
