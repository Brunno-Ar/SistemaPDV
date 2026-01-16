import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ClosedRegisterAlertProps {
  open: boolean;
  onRedirect: () => void;
}

export function ClosedRegisterAlert({
  open,
  onRedirect,
}: ClosedRegisterAlertProps) {
  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Caixa Fechado</AlertDialogTitle>
          <AlertDialogDescription>
            Por favor, abra o caixa no Dashboard para iniciar as vendas. Todas
            as operações de venda estão bloqueadas até a abertura do caixa.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={onRedirect}>
            Ir para Dashboard
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
