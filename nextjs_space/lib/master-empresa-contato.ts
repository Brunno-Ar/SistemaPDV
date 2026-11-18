import { prisma } from "@/lib/db";

export interface EditarEmpresaContatoInput {
  empresaId?: unknown;
  cpfCnpj?: unknown;
  telefone?: unknown;
}

export type ResultadoEditarContato =
  | {
      ok: true;
      empresa: {
        id: string;
        nome: string;
        cpfCnpj: string | null;
        telefone: string | null;
      };
    }
  | {
      ok: false;
      status: number;
      erro: string;
    };

/**
 * Valida, normaliza e persiste dados de contato (CPF/CNPJ e telefone) de uma empresa.
 * Apenas campos cadastrais sao alterados. Status, plano, vencimento e Asaas permanecem intocados.
 */
export async function editarEmpresaContato(
  input: EditarEmpresaContatoInput,
): Promise<ResultadoEditarContato> {
  const { empresaId, cpfCnpj, telefone } = input;

  if (!empresaId || typeof empresaId !== "string" || !empresaId.trim()) {
    return { ok: false, status: 400, erro: "ID da empresa é obrigatório" };
  }

  const idLimpo = empresaId.trim();

  if (cpfCnpj === undefined && telefone === undefined) {
    return {
      ok: false,
      status: 400,
      erro: "Informe ao menos um campo para atualização (cpfCnpj ou telefone)",
    };
  }

  let normalizadoCpfCnpj: string | null | undefined = undefined;
  if (cpfCnpj !== undefined) {
    if (cpfCnpj === null || (typeof cpfCnpj === "string" && cpfCnpj.trim() === "")) {
      normalizadoCpfCnpj = null;
    } else if (typeof cpfCnpj === "string") {
      const digitos = cpfCnpj.replace(/\D/g, "");
      if (digitos.length !== 11 && digitos.length !== 14) {
        return {
          ok: false,
          status: 400,
          erro: "CPF deve ter 11 dígitos ou CNPJ deve ter 14 dígitos",
        };
      }
      normalizadoCpfCnpj = digitos;
    } else {
      return { ok: false, status: 400, erro: "Formato de CPF/CNPJ inválido" };
    }
  }

  let normalizadoTelefone: string | null | undefined = undefined;
  if (telefone !== undefined) {
    if (telefone === null || (typeof telefone === "string" && telefone.trim() === "")) {
      normalizadoTelefone = null;
    } else if (typeof telefone === "string") {
      let digitosTel = telefone.replace(/\D/g, "");
      // ponytail: strip prefixo DDI 55 para numeros com DDD e 8/9 digitos; upgrade para libphonenumber se FlowPDV suportar operacao internacional
      if ((digitosTel.length === 12 || digitosTel.length === 13) && digitosTel.startsWith("55")) {
        digitosTel = digitosTel.slice(2);
      }
      if (digitosTel.length < 10 || digitosTel.length > 11) {
        return {
          ok: false,
          status: 400,
          erro: "Telefone deve conter DDD e 8 ou 9 dígitos (10 ou 11 dígitos no total)",
        };
      }
      normalizadoTelefone = digitosTel;
    } else {
      return { ok: false, status: 400, erro: "Formato de telefone inválido" };
    }
  }

  const empresaExistente = await prisma.empresa.findUnique({
    where: { id: idLimpo },
    select: {
      id: true,
      nome: true,
      cpfCnpj: true,
      telefone: true,
    },
  });

  if (!empresaExistente) {
    return { ok: false, status: 404, erro: "Empresa não encontrada" };
  }

  if (
    normalizadoCpfCnpj &&
    normalizadoCpfCnpj !== empresaExistente.cpfCnpj
  ) {
    const conflito = await prisma.empresa.findFirst({
      where: {
        cpfCnpj: normalizadoCpfCnpj,
        id: { not: empresaExistente.id },
      },
      select: { id: true },
    });

    if (conflito) {
      return {
        ok: false,
        status: 409,
        erro: "Este CPF/CNPJ já está cadastrado em outra empresa",
      };
    }
  }

  const dadosAtualizacao: { cpfCnpj?: string | null; telefone?: string | null } = {};
  if (normalizadoCpfCnpj !== undefined) {
    dadosAtualizacao.cpfCnpj = normalizadoCpfCnpj;
  }
  if (normalizadoTelefone !== undefined) {
    dadosAtualizacao.telefone = normalizadoTelefone;
  }

  const empresaAtualizada = await prisma.empresa.update({
    where: { id: empresaExistente.id },
    data: dadosAtualizacao,
    select: {
      id: true,
      nome: true,
      cpfCnpj: true,
      telefone: true,
    },
  });

  return {
    ok: true,
    empresa: empresaAtualizada,
  };
}
