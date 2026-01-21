"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, LogOut, X } from "lucide-react";

interface LogoutConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLogoutWithClosing: () => void;
  onLogoutWithoutClosing: () => void;
  onOpenFechamento: () => void;
  isLoading: boolean;
}

export function LogoutConfirmationDialog({
  open,
  onOpenChange,
  onLogoutWithClosing,
  onLogoutWithoutClosing,
  onOpenFechamento,
  isLoading,
}: LogoutConfirmationDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Caixa Aberto
          </DialogTitle>
          <DialogDescription>
            Você ainda tem um caixa aberto. O que deseja fazer?
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-3">
          <Button
            variant="default"
            className="w-full justify-start gap-2 bg-[#0f172a] hover:bg-[#1e293b]"
            onClick={onOpenFechamento}
            disabled={isLoading}
          >
            💰 Fazer Fechamento do Caixa
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Recomendado: faça o fechamento para conferir os valores do dia.
          </p>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={onLogoutWithoutClosing}
            disabled={isLoading}
          >
            <LogOut className="h-4 w-4 mr-2" />
            {isLoading ? "Saindo..." : "Sair Sem Fechar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
