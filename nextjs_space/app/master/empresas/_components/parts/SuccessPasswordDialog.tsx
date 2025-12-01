import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { InteractiveHoverButton } from "@/components/ui/interactive-hover-button";
import { CheckCircle } from "lucide-react";

interface SuccessPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SuccessPasswordDialog({
  open,
  onOpenChange,
}: SuccessPasswordDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-green-600 flex items-center gap-2">
            <CheckCircle className="h-6 w-6" />
            Senha Resetada com Sucesso!
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-4 pt-2">
            <p className="text-base text-gray-700">
              A senha do administrador foi redefinida para:
            </p>
            <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 text-center">
              <span className="text-2xl font-mono font-bold text-slate-900 dark:text-white tracking-wider select-all">
                Mudar123
              </span>
            </div>
            <p className="text-sm text-gray-500">
              Copie esta senha e envie para o administrador. Ele deverá
              alterá-la no próximo login.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <InteractiveHoverButton
            onClick={() => onOpenChange(false)}
            className="w-full bg-green-600 hover:bg-green-700 text-white border-green-600"
          >
            Entendido
          </InteractiveHoverButton>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
