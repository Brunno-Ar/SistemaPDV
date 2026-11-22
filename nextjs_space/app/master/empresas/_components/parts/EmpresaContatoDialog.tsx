"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface EmpresaContatoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  empresa: {
    id: string;
    nome: string;
    cpfCnpj?: string | null;
    telefone?: string | null;
  };
  onAtualizar: () => void;
}

// Formata CPF (11 dígitos) ou CNPJ (14 dígitos)
export const formatCpfCnpj = (value: string) => {
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

// Formata telefone (10 ou 11 dígitos)
export const formatPhone = (value: string) => {
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

// Valida dígitos verificadores do CPF
export const validarCpf = (cpf: string): boolean => {
  const nums = cpf.replace(/\D/g, "");
  if (nums.length !== 11 || /^(\d)\1{10}$/.test(nums)) return false;
  let soma = 0;
  for (let i = 0; i < 9; i++) soma += Number(nums[i]) * (10 - i);
  let resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== Number(nums[9])) return false;
  soma = 0;
  for (let i = 0; i < 10; i++) soma += Number(nums[i]) * (11 - i);
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  return resto === Number(nums[10]);
};

// Valida dígitos verificadores do CNPJ
export const validarCnpj = (cnpj: string): boolean => {
  const nums = cnpj.replace(/\D/g, "");
  if (nums.length !== 14 || /^(\d)\1{13}$/.test(nums)) return false;
  const peso1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const peso2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let soma = 0;
  for (let i = 0; i < 12; i++) soma += Number(nums[i]) * peso1[i];
  let digito = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  if (digito !== Number(nums[12])) return false;
  soma = 0;
  for (let i = 0; i < 13; i++) soma += Number(nums[i]) * peso2[i];
  digito = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  return digito === Number(nums[13]);
};

export function EmpresaContatoDialog({
  open,
  onOpenChange,
  empresa,
  onAtualizar,
}: EmpresaContatoDialogProps) {
  const [cpfCnpj, setCpfCnpj] = useState(empresa.cpfCnpj || "");
  const [telefone, setTelefone] = useState(empresa.telefone || "");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cpfCnpjDigits = cpfCnpj.replace(/\D/g, "");
    const telefoneDigits = telefone.replace(/\D/g, "");

    // Validação client-side (complementar à validação server-side)
    if (cpfCnpjDigits.length > 0) {
      if (cpfCnpjDigits.length === 11 && !validarCpf(cpfCnpjDigits)) {
        setError("CPF inválido");
        return;
      }
      if (cpfCnpjDigits.length === 14 && !validarCnpj(cpfCnpjDigits)) {
        setError("CNPJ inválido");
        return;
      }
      if (
        cpfCnpjDigits.length !== 0 &&
        cpfCnpjDigits.length !== 11 &&
        cpfCnpjDigits.length !== 14
      ) {
        setError("CPF deve ter 11 dígitos ou CNPJ 14 dígitos");
        return;
      }
    }

    if (
      telefoneDigits.length > 0 &&
      telefoneDigits.length !== 10 &&
      telefoneDigits.length !== 11
    ) {
      setError("Telefone deve ter 10 ou 11 dígitos");
      return;
    }

    setSending(true);
    try {
      const res = await fetch("/api/master/empresas", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          empresaId: empresa.id,
          cpfCnpj: cpfCnpjDigits || null,
          telefone: telefoneDigits || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Erro ao atualizar");
        return;
      }

      toast({
        title: "Sucesso",
        description: "Dados cadastrais atualizados com sucesso!",
      });
      onOpenChange(false);
      onAtualizar();
    } catch {
      setError("Falha ao conectar com o servidor");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Contato da Empresa</DialogTitle>
          <DialogDescription>
            Atualizar documento e telefone de {empresa.nome}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {error && (
            <div className="rounded-md border border-red-500/50 bg-red-50/50 px-4 py-3 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-400" role="alert">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="ec-cpfCnpj">Documento (CPF / CNPJ)</Label>
            <Input
              id="ec-cpfCnpj"
              value={cpfCnpj}
              onChange={(e) => setCpfCnpj(formatCpfCnpj(e.target.value))}
              placeholder="000.000.000-00 / 00.000.000/0000-00"
              required
            />
            <p className="text-xs text-muted-foreground">
              CPF (11 dígitos) ou CNPJ (14 dígitos). Somente números são salvos.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ec-telefone">Telefone / WhatsApp</Label>
            <Input
              id="ec-telefone"
              value={telefone}
              onChange={(e) => setTelefone(formatPhone(e.target.value))}
              placeholder="(99) 99999-9999"
              required
            />
            <p className="text-xs text-muted-foreground">
              10 ou 11 dígitos com DDD.
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setCpfCnpj(empresa.cpfCnpj || "");
                setTelefone(empresa.telefone || "");
                setError(null);
                onOpenChange(false);
              }}
              disabled={sending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={sending}>
              {sending ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="animate-spin h-4 w-4" />
                  <span>Salvando...</span>
                </div>
              ) : (
                "Salvar"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
