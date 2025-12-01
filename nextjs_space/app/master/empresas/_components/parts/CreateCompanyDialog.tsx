import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { InteractiveHoverButton } from "@/components/ui/interactive-hover-button";

interface CreateCompanyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (e: React.FormEvent) => void;
  formData: any;
  setFormData: (data: any) => void;
  submitting: boolean;
}

export function CreateCompanyDialog({
  open,
  onOpenChange,
  onSubmit,
  formData,
  setFormData,
  submitting,
}: CreateCompanyDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Criar Nova Empresa</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label htmlFor="nomeEmpresa">Nome da Empresa</Label>
            <Input
              id="nomeEmpresa"
              value={formData.nomeEmpresa}
              onChange={(e) =>
                setFormData({ ...formData, nomeEmpresa: e.target.value })
              }
              required
            />
          </div>
          <div>
            <Label htmlFor="adminNome">Nome do Admin</Label>
            <Input
              id="adminNome"
              value={formData.adminNome}
              onChange={(e) =>
                setFormData({ ...formData, adminNome: e.target.value })
              }
              required
            />
          </div>
          <div>
            <Label htmlFor="adminEmail">Email do Admin</Label>
            <Input
              id="adminEmail"
              type="email"
              value={formData.adminEmail}
              onChange={(e) =>
                setFormData({ ...formData, adminEmail: e.target.value })
              }
              required
            />
          </div>
          <div>
            <Label htmlFor="adminSenha">Senha do Admin</Label>
            <Input
              id="adminSenha"
              type="password"
              value={formData.adminSenha}
              onChange={(e) =>
                setFormData({ ...formData, adminSenha: e.target.value })
              }
              required
            />
          </div>
          <InteractiveHoverButton
            type="submit"
            className="w-full bg-cta-bg text-white border-cta-bg hover:bg-cta-bg/90"
            disabled={submitting}
          >
            {submitting ? "Criando..." : "Criar Empresa"}
          </InteractiveHoverButton>
        </form>
      </DialogContent>
    </Dialog>
  );
}
