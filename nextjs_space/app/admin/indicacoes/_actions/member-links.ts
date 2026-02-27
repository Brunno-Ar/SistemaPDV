"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";

/**
 * Retorna os dados do link de indicação do admin logado.
 * Se não existir, gera um novo link.
 */
export async function getOrCreateMemberLink() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user.empresaId || session.user.role !== "admin") {
    throw new Error("Não autorizado");
  }

  const empresaId = session.user.empresaId;

  // Busca link existente
  let link = await prisma.memberLink.findUnique({
    where: { empresaId },
    include: {
      conversoes: true,
    },
  });

  // Se não tem, cria um baseado no ID da empresa
  if (!link) {
    const defaultCodigo = `link-${empresaId.substring(0, 8)}`;
    link = await prisma.memberLink.create({
      data: {
        empresaId,
        codigoURL: defaultCodigo,
      },
      include: {
        conversoes: true,
      },
    });
  }

  return link;
}

/**
 * Permite que o admin personalize o sufixo do seu link (ex: link-do-joao)
 */
export async function updateMemberLinkCode(newCode: string) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user.empresaId || session.user.role !== "admin") {
    throw new Error("Não autorizado");
  }

  const empresaId = session.user.empresaId;

  // Validar formato (apenas letras, números e hifens)
  const schema = z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-zA-Z0-9-]+$/);
  const isValid = schema.safeParse(newCode);

  if (!isValid.success) {
    return { error: "Formato inválido. Use apenas letras, números e hifens." };
  }

  try {
    const updated = await prisma.memberLink.update({
      where: { empresaId },
      data: {
        codigoURL: newCode.toLowerCase(),
      },
    });

    revalidatePath("/admin/indicacoes");
    return { success: true, link: updated };
  } catch (error: any) {
    if (error.code === "P2002") {
      return { error: "Este link já está em uso por outra empresa." };
    }
    return { error: "Falha ao atualizar o link." };
  }
}
