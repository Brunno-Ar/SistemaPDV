import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { InteractiveHoverButton } from "@/components/ui/interactive-hover-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Trash2, Lock } from "lucide-react";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";

interface EmployeeActionsProps {
  funcionario: any;
  dialogAvisoOpen: boolean;
  setDialogAvisoOpen: (open: boolean) => void;
  mensagemAviso: string;
  setMensagemAviso: (value: string) => void;
  handleSendAviso: () => void;
  sendingAviso: boolean;
  deleteDialogOpen: boolean;
  setDeleteDialogOpen: (open: boolean) => void;
  handleDeleteFuncionario: () => void;
  deleting: boolean;
}

export function EmployeeActions({
  funcionario,
  dialogAvisoOpen,
  setDialogAvisoOpen,
  mensagemAviso,
  setMensagemAviso,
  handleSendAviso,
  sendingAviso,
  deleteDialogOpen,
  setDeleteDialogOpen,
  handleDeleteFuncionario,
  deleting,
}: EmployeeActionsProps) {
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  const handleResetPassword = async () => {
    if (newPassword.length < 6) {
      toast({
        title: "Erro",
        description: "A senha deve ter pelo menos 6 caracteres",
        variant: "destructive",
      });
      return;
    }

    setResetLoading(true);
    try {
      const response = await fetch(
        `/api/admin/users/${funcionario.id}/reset-password`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ newPassword }),
        },
      );

      const data = await response.json();

      if (!response.ok) throw new Error(data.error);

      toast({
        title: "Sucesso",
        description: "Senha resetada com sucesso",
      });
      setResetDialogOpen(false);
      setNewPassword("");
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao resetar senha",
        variant: "destructive",
      });
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ações de Gestão</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-4">
          <Dialog open={dialogAvisoOpen} onOpenChange={setDialogAvisoOpen}>
            <DialogTrigger asChild>
              <InteractiveHoverButton className="bg-blue-600 text-white hover:bg-blue-700">
                <Mail className="mr-2 h-4 w-4" />
                Enviar Aviso
              </InteractiveHoverButton>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Enviar Aviso para {funcionario.nome}</DialogTitle>
                <DialogDescription>
                  Esta mensagem aparecerá no mural de avisos do funcionário.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Mensagem</Label>
                  <Textarea
                    placeholder="Digite sua mensagem aqui..."
                    value={mensagemAviso}
                    onChange={(e) => setMensagemAviso(e.target.value)}
                    rows={4}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setDialogAvisoOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button onClick={handleSendAviso} disabled={sendingAviso}>
                    {sendingAviso ? "Enviando..." : "Enviar"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
            <DialogTrigger asChild>
              <InteractiveHoverButton className="bg-amber-500 text-white hover:bg-amber-600 border-amber-600">
                <Lock className="mr-2 h-4 w-4" />
                Resetar Senha
              </InteractiveHoverButton>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Resetar Senha de {funcionario.nome}</DialogTitle>
                <DialogDescription>
                  Defina uma nova senha para este usuário.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Nova Senha</Label>
                  <Input
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setResetDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button onClick={handleResetPassword} disabled={resetLoading}>
                    {resetLoading ? "Salvando..." : "Salvar Nova Senha"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <DialogTrigger asChild>
              <InteractiveHoverButton className="bg-red-500 text-white hover:bg-red-600 border-red-600">
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir Funcionário
              </InteractiveHoverButton>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Excluir Funcionário</DialogTitle>
                <DialogDescription>
                  Tem certeza que deseja excluir{" "}
                  <strong>{funcionario.nome}</strong>? Esta ação não pode ser
                  desfeita e removerá o acesso deste usuário ao sistema.
                </DialogDescription>
              </DialogHeader>
              <div className="flex justify-end gap-2 mt-4">
                <Button
                  variant="outline"
                  onClick={() => setDeleteDialogOpen(false)}
                  disabled={deleting}
                >
                  Cancelar
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDeleteFuncionario}
                  disabled={deleting}
                >
                  {deleting ? "Excluindo..." : "Confirmar Exclusão"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
}
