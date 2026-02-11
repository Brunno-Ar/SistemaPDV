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
import { Loader2 } from "lucide-react";

interface CreateCompanyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (e: React.FormEvent) => void;
  formData: {
    nomeEmpresa: string;
    cpfCnpj: string;
    adminNome: string;
    adminEmail: string;
    adminSenha: string;
    telefone: string;
    diaVencimento: number;
    // Address
    cep: string;
    logradouro: string;
    numero: string;
    bairro: string;
    cidade: string;
    estado: string;
  };
  setFormData: (data: any) => void;
  submitting: boolean;
  loadingCep?: boolean;
  onCepBlur?: () => void;
}

// Format phone function
const formatPhone = (value: string) => {
  const numbers = value.replace(/\D/g, "");
  if (numbers.length === 0) return "";
  if (numbers.length <= 2) return `(${numbers}`;
  if (numbers.length <= 6)
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
  if (numbers.length <= 10)
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(
      6,
    )}`;
  return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(
    7,
    11,
  )}`;
};

const formatCpfCnpj = (value: string) => {
  const numbers = value.replace(/\D/g, "");
  if (numbers.length <= 11) {
    return numbers
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})/, "$1-$2")
      .replace(/(-\d{2})\d+?$/, "$1");
  }
  return numbers
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2")
    .replace(/(-\d{2})\d+?$/, "$1");
};

const formatCep = (value: string) => {
  return value
    .replace(/\D/g, "")
    .replace(/^(\d{5})(\d)/, "$1-$2")
    .slice(0, 9);
};

export function CreateCompanyDialog({
  open,
  onOpenChange,
  onSubmit,
  formData,
  setFormData,
  submitting,
  loadingCep,
  onCepBlur,
}: CreateCompanyDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Criar Nova Empresa</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
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
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="cpfCnpj">CPF / CNPJ</Label>
              <Input
                id="cpfCnpj"
                value={formData.cpfCnpj}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    cpfCnpj: formatCpfCnpj(e.target.value),
                  })
                }
                placeholder="00.000.000/0000-00"
                required
              />
            </div>
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
                required
              />
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">
              Endereço
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2">
              <div>
                <Label htmlFor="cep">CEP</Label>
                <div className="relative">
                  <Input
                    id="cep"
                    value={formData.cep}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        cep: formatCep(e.target.value),
                      })
                    }
                    onBlur={onCepBlur}
                    placeholder="00000-000"
                    required
                  />
                  {loadingCep && (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2">
                      <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
                    </div>
                  )}
                </div>
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="logradouro">Logradouro</Label>
                <Input
                  id="logradouro"
                  value={formData.logradouro}
                  onChange={(e) =>
                    setFormData({ ...formData, logradouro: e.target.value })
                  }
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 mb-2">
              <div>
                <Label htmlFor="numero">Número</Label>
                <Input
                  id="numero"
                  value={formData.numero}
                  onChange={(e) =>
                    setFormData({ ...formData, numero: e.target.value })
                  }
                  required
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="bairro">Bairro</Label>
                <Input
                  id="bairro"
                  value={formData.bairro}
                  onChange={(e) =>
                    setFormData({ ...formData, bairro: e.target.value })
                  }
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <Label htmlFor="cidade">Cidade</Label>
                <Input
                  id="cidade"
                  value={formData.cidade}
                  onChange={(e) =>
                    setFormData({ ...formData, cidade: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="estado">Estado (UF)</Label>
                <Input
                  id="estado"
                  value={formData.estado}
                  maxLength={2}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      estado: e.target.value.toUpperCase(),
                    })
                  }
                  required
                />
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">
              Administrador
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
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
          </div>

          <InteractiveHoverButton
            type="submit"
            className="w-full bg-cta-bg text-white border-cta-bg hover:bg-cta-bg/90 mt-4"
            disabled={submitting}
          >
            {submitting ? (
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="animate-spin h-5 w-5" />
                <span>Criando...</span>
              </div>
            ) : (
              "Criar Empresa"
            )}
          </InteractiveHoverButton>
        </form>
      </DialogContent>
    </Dialog>
  );
}
