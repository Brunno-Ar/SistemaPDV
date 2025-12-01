import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { InteractiveHoverButton } from "@/components/ui/interactive-hover-button";

interface ResetPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  empresaToReset: any;
  setEmpresaToReset: (empresa: any) => void;
  confirmResetSenha: () => void;
}

export function ResetPasswordDialog({
  open,
  onOpenChange,
  empresaToReset,
  setEmpresaToReset,
  confirmResetSenha,
}: ResetPasswordDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Resetar Senha do Administrador?</AlertDialogTitle>
          <AlertDialogDescription>
            Você está prestes a resetar a senha do admin da empresa{" "}
            <strong className="text-black">{empresaToReset?.nome}</strong>. A
            senha temporária será definida como{" "}
            <strong className="text-black">Mudar123</strong>. O usuário
            precisará alterá-la no próximo login.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <InteractiveHoverButton
            className="bg-white hover:bg-gray-50 text-gray-700 border-gray-200"
            onClick={() => {
              onOpenChange(false);
              setEmpresaToReset(null);
            }}
          >
            Cancelar
          </InteractiveHoverButton>
          <InteractiveHoverButton
            onClick={confirmResetSenha}
            className="bg-orange-600 hover:bg-orange-700 text-white border-orange-600"
          >
            Confirmar Reset
          </InteractiveHoverButton>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
