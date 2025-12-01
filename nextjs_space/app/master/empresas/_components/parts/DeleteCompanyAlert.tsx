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

interface DeleteCompanyAlertProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  empresaToDelete: any;
  setEmpresaToDelete: (empresa: any) => void;
  deleteConfirmText: string;
  setDeleteConfirmText: (text: string) => void;
  handleConfirmDelete: () => void;
}

export function DeleteCompanyAlert({
  open,
  onOpenChange,
  empresaToDelete,
  setEmpresaToDelete,
  deleteConfirmText,
  setDeleteConfirmText,
  handleConfirmDelete,
}: DeleteCompanyAlertProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Tem certeza absoluta?</AlertDialogTitle>
          <AlertDialogDescription className="space-y-4">
            <p>
              Esta ação é <strong className="text-red-600">IRREVERSÍVEL</strong>{" "}
              e excluirá permanentemente a empresa{" "}
              <strong className="text-black">{empresaToDelete?.nome}</strong> e
              todos os dados relacionados.
            </p>
            <div className="space-y-2 pt-2">
              <p className="font-semibold">
                Digite{" "}
                <span className="text-red-600 font-mono">
                  {empresaToDelete?.nome}
                </span>{" "}
                abaixo para confirmar:
              </p>
              <Input
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="Digite o nome da empresa"
                className="font-mono"
              />
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <InteractiveHoverButton
            className="bg-white hover:bg-gray-50 text-gray-700 border-gray-200"
            onClick={() => {
              setDeleteConfirmText("");
              setEmpresaToDelete(null);
              onOpenChange(false);
            }}
          >
            Cancelar
          </InteractiveHoverButton>
          <InteractiveHoverButton
            onClick={handleConfirmDelete}
            disabled={deleteConfirmText !== empresaToDelete?.nome}
            className="bg-red-600 hover:bg-red-700 text-white border-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Excluir Permanentemente
          </InteractiveHoverButton>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
