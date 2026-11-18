import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";

export interface AtualizarPerfilEmpresaInput {
  cpfCnpj?: unknown;
  telefone?: unknown;
  enderecoLogradouro?: unknown;
  enderecoNumero?: unknown;
  enderecoBairro?: unknown;
  enderecoCidade?: unknown;
  enderecoUf?: unknown;
  enderecoCep?: unknown;
  [key: string]: unknown; // Permite descartar silenciosamente campos extras como empresaId, status, etc.
}

export interface PerfilEmpresaResposta {
  id: string;
  nome: string;
  cpfCnpj: string | null;
  telefone: string | null;
  enderecoLogradouro: string;
  enderecoNumero: string;
  enderecoBairro: string;
  enderecoCidade: string;
  enderecoUf: string;
  enderecoCep: string;
}

export type ResultadoPerfilEmpresa =
  | {
      ok: true;
      empresa: PerfilEmpresaResposta;
    }
  | {
      ok: false;
      status: number;
      erro: string;
    };

/**
 * Busca os dados cadastrais da empresa para exibição no formulário de configurações.
 */
export async function obterPerfilEmpresa(
  empresaId: string,
): Promise<ResultadoPerfilEmpresa> {
  const empresa = await prisma.empresa.findUnique({
    where: { id: empresaId },
    select: {
      id: true,
      nome: true,
      cpfCnpj: true,
      telefone: true,
      enderecoLogradouro: true,
      enderecoNumero: true,
      enderecoBairro: true,
      enderecoCidade: true,
      enderecoUf: true,
      enderecoCep: true,
    },
  });

  if (!empresa) {
    return { ok: false, status: 404, erro: "Empresa não encontrada" };
  }

  return {
    ok: true,
    empresa: {
      id: empresa.id,
      nome: empresa.nome,
      cpfCnpj: empresa.cpfCnpj,
      telefone: empresa.telefone,
      enderecoLogradouro: empresa.enderecoLogradouro || "",
      enderecoNumero: empresa.enderecoNumero || "",
      enderecoBairro: empresa.enderecoBairro || "",
      enderecoCidade: empresa.enderecoCidade || "",
      enderecoUf: empresa.enderecoUf || "",
      enderecoCep: empresa.enderecoCep || "",
    },
  };
}

/**
 * Atualiza com validação e whitelist estrita os dados cadastrais da própria empresa.
 * Garante que status, plano, vencimento, diaVencimento e Asaas permaneçam intocados.
 */
export async function atualizarPerfilEmpresa(
  empresaId: string,
  input: AtualizarPerfilEmpresaInput,
): Promise<ResultadoPerfilEmpresa> {
  const empresaExistente = await prisma.empresa.findUnique({
    where: { id: empresaId },
    select: {
      id: true,
      nome: true,
      cpfCnpj: true,
      telefone: true,
      enderecoLogradouro: true,
      enderecoNumero: true,
      enderecoBairro: true,
      enderecoCidade: true,
      enderecoUf: true,
      enderecoCep: true,
    },
  });

  if (!empresaExistente) {
    return { ok: false, status: 404, erro: "Empresa não encontrada" };
  }

  const {
    cpfCnpj,
    telefone,
    enderecoLogradouro,
    enderecoNumero,
    enderecoBairro,
    enderecoCidade,
    enderecoUf,
    enderecoCep,
  } = input;

  const dataToUpdate: Prisma.EmpresaUpdateInput = {};
  let alterouAlgo = false;

  // 1. CPF/CNPJ
  if (cpfCnpj !== undefined) {
    if (cpfCnpj === null || (typeof cpfCnpj === "string" && cpfCnpj.trim() === "")) {
      dataToUpdate.cpfCnpj = null;
      alterouAlgo = true;
    } else if (typeof cpfCnpj === "string") {
      const digitos = cpfCnpj.replace(/\D/g, "");
      if (digitos.length !== 11 && digitos.length !== 14) {
        return {
          ok: false,
          status: 400,
          erro: "CPF deve ter 11 dígitos ou CNPJ deve ter 14 dígitos",
        };
      }

      // Verificação prévia de conflito contra outra empresa
      if (digitos !== empresaExistente.cpfCnpj) {
        const conflito = await prisma.empresa.findFirst({
          where: {
            cpfCnpj: digitos,
            id: { not: empresaId },
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

      dataToUpdate.cpfCnpj = digitos;
      alterouAlgo = true;
    } else {
      return { ok: false, status: 400, erro: "Formato de CPF/CNPJ inválido" };
    }
  }

  // 2. Telefone
  if (telefone !== undefined) {
    if (telefone === null || (typeof telefone === "string" && telefone.trim() === "")) {
      dataToUpdate.telefone = null;
      alterouAlgo = true;
    } else if (typeof telefone === "string") {
      let digitosTel = telefone.replace(/\D/g, "");
      // ponytail: strip prefixo DDI 55 se vier com DDD; upgrade para libphonenumber se FlowPDV expandir fora do BR
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
      dataToUpdate.telefone = digitosTel;
      alterouAlgo = true;
    } else {
      return { ok: false, status: 400, erro: "Formato de telefone inválido" };
    }
  }

  // 3. Endereço: Logradouro
  if (enderecoLogradouro !== undefined) {
    if (typeof enderecoLogradouro !== "string") {
      return { ok: false, status: 400, erro: "Logradouro inválido" };
    }
    dataToUpdate.enderecoLogradouro = enderecoLogradouro.trim();
    alterouAlgo = true;
  }

  // 4. Endereço: Número
  if (enderecoNumero !== undefined) {
    if (typeof enderecoNumero !== "string") {
      return { ok: false, status: 400, erro: "Número de endereço inválido" };
    }
    dataToUpdate.enderecoNumero = enderecoNumero.trim();
    alterouAlgo = true;
  }

  // 5. Endereço: Bairro
  if (enderecoBairro !== undefined) {
    if (typeof enderecoBairro !== "string") {
      return { ok: false, status: 400, erro: "Bairro inválido" };
    }
    dataToUpdate.enderecoBairro = enderecoBairro.trim();
    alterouAlgo = true;
  }

  // 6. Endereço: Cidade
  if (enderecoCidade !== undefined) {
    if (typeof enderecoCidade !== "string") {
      return { ok: false, status: 400, erro: "Cidade inválida" };
    }
    dataToUpdate.enderecoCidade = enderecoCidade.trim();
    alterouAlgo = true;
  }

  // 7. Endereço: UF
  if (enderecoUf !== undefined) {
    if (typeof enderecoUf !== "string") {
      return { ok: false, status: 400, erro: "UF inválida" };
    }
    const ufLimpa = enderecoUf.trim().toUpperCase();
    if (ufLimpa !== "" && !/^[A-Z]{2}$/.test(ufLimpa)) {
      return { ok: false, status: 400, erro: "UF deve conter exatamente 2 letras" };
    }
    dataToUpdate.enderecoUf = ufLimpa;
    alterouAlgo = true;
  }

  // 8. Endereço: CEP
  if (enderecoCep !== undefined) {
    if (typeof enderecoCep !== "string") {
      return { ok: false, status: 400, erro: "CEP inválido" };
    }
    const cepDigitos = enderecoCep.replace(/\D/g, "");
    if (cepDigitos !== "" && cepDigitos.length !== 8) {
      return { ok: false, status: 400, erro: "CEP deve conter 8 dígitos" };
    }
    dataToUpdate.enderecoCep = cepDigitos;
    alterouAlgo = true;
  }

  if (!alterouAlgo) {
    return {
      ok: false,
      status: 400,
      erro: "Nenhum campo válido fornecido para atualização",
    };
  }

  try {
    const atualizada = await prisma.empresa.update({
      where: { id: empresaId },
      data: dataToUpdate,
      select: {
        id: true,
        nome: true,
        cpfCnpj: true,
        telefone: true,
        enderecoLogradouro: true,
        enderecoNumero: true,
        enderecoBairro: true,
        enderecoCidade: true,
        enderecoUf: true,
        enderecoCep: true,
      },
    });

    return {
      ok: true,
      empresa: {
        id: atualizada.id,
        nome: atualizada.nome,
        cpfCnpj: atualizada.cpfCnpj,
        telefone: atualizada.telefone,
        enderecoLogradouro: atualizada.enderecoLogradouro || "",
        enderecoNumero: atualizada.enderecoNumero || "",
        enderecoBairro: atualizada.enderecoBairro || "",
        enderecoCidade: atualizada.enderecoCidade || "",
        enderecoUf: atualizada.enderecoUf || "",
        enderecoCep: atualizada.enderecoCep || "",
      },
    };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return {
        ok: false,
        status: 409,
        erro: "Este CPF/CNPJ já está cadastrado em outra empresa",
      };
    }
    console.error("Erro ao atualizar dados cadastrais da empresa:", err);
    return { ok: false, status: 500, erro: "Erro interno do servidor" };
  }
}
