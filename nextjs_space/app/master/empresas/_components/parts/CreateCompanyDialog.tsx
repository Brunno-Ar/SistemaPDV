import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { InteractiveHoverButton } from "@/components/ui/interactive-hover-button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CreateCompanyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (e: React.FormEvent) => void;
  formData: {
    nomeEmpresa: string;
    adminNome: string;
    adminEmail: string;
    adminSenha: string;
    telefone: string;
    diaVencimento: number;
  };
  setFormData: (data: any) => void;
  submitting: boolean;
}

// Format phone function
const formatPhone = (value: string) => {
  const numbers = value.replace(/\D/g, "");
  if (numbers.length === 0) return "";
  if (numbers.length <= 2) return `(${numbers}`;
  if (numbers.length <= 6) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
  if (numbers.length <= 10)
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(
      6
    )}`;
  return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(
    7,
    11
  )}`;
};

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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="telefone">WhatsApp/Telefone</Label>
              <Input
                id="telefone"
                placeholder="(99) 99999-9999"
                value={formData.telefone}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    telefone: formatPhone(e.target.value),
                  })
                }
              />
            </div>
            <div>
              <Label htmlFor="diaVencimento">Dia de Vencimento</Label>
              <Select
                value={String(formData.diaVencimento)}
                onValueChange={(value) =>
                  setFormData({ ...formData, diaVencimento: parseInt(value) })
                }
              >
                <SelectTrigger id="diaVencimento">
                  <SelectValue placeholder="Selecione o dia" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                    <SelectItem key={day} value={String(day)}>
                      {day}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
