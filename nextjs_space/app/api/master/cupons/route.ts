import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

// GET - Listar todos os cupons
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "master") {
      return NextResponse.json(
        { error: "Acesso negado. Apenas usuários master." },
        { status: 403 },
      );
    }

    const cupons = await prisma.cupom.findMany({
      orderBy: { codigo: "asc" },
    });

    // Adicionar info se está expirado ou esgotado
    const cuponsFormatados = cupons.map((cupom) => {
      const agora = new Date();
      const expirado = cupom.validoAte ? cupom.validoAte < agora : false;
      const esgotado =
        cupom.limiteUsos !== null && cupom.usosAtuais >= cupom.limiteUsos;

      return {
        ...cupom,
        expirado,
        esgotado,
        ativo: !expirado && !esgotado,
      };
    });

    return NextResponse.json(cuponsFormatados);
  } catch (error) {
    console.error("Erro ao buscar cupons:", error);
    return NextResponse.json(
      { error: "Erro ao buscar cupons" },
      { status: 500 },
    );
  }
}

// POST - Criar novo cupom
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "master") {
      return NextResponse.json(
        { error: "Acesso negado. Apenas usuários master." },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { codigo, descontoPorcentagem, validoAte, limiteUsos } = body;

    // Validações
    if (!codigo || descontoPorcentagem === undefined) {
      return NextResponse.json(
        { error: "Código e porcentagem de desconto são obrigatórios" },
        { status: 400 },
      );
    }

    if (descontoPorcentagem < 1 || descontoPorcentagem > 100) {
      return NextResponse.json(
        { error: "Desconto deve ser entre 1% e 100%" },
        { status: 400 },
      );
    }

    // Verificar se já existe
    const existente = await prisma.cupom.findUnique({
      where: { codigo: codigo.toUpperCase() },
    });

    if (existente) {
      return NextResponse.json(
        { error: "Já existe um cupom com este código" },
        { status: 400 },
      );
    }

    // Criar cupom
    const cupom = await prisma.cupom.create({
      data: {
        codigo: codigo.toUpperCase(),
        descontoPorcentagem: parseFloat(descontoPorcentagem),
        validoAte: validoAte ? new Date(validoAte) : null,
        limiteUsos: limiteUsos ? parseInt(limiteUsos) : null,
        // duracaoMeses será armazenado como metadado se necessário no futuro
      },
    });

    revalidatePath("/master/cupons");

    return NextResponse.json({
      success: true,
      message: "Cupom criado com sucesso!",
      cupom,
    });
  } catch (error) {
    console.error("Erro ao criar cupom:", error);
    return NextResponse.json({ error: "Erro ao criar cupom" }, { status: 500 });
  }
}

// PUT - Atualizar cupom
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "master") {
      return NextResponse.json(
        { error: "Acesso negado. Apenas usuários master." },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { codigo, descontoPorcentagem, validoAte, limiteUsos } = body;

    if (!codigo) {
      return NextResponse.json(
        { error: "Código do cupom é obrigatório" },
        { status: 400 },
      );
    }

    // Verificar se existe
    const existente = await prisma.cupom.findUnique({
      where: { codigo: codigo.toUpperCase() },
    });

    if (!existente) {
      return NextResponse.json(
        { error: "Cupom não encontrado" },
        { status: 404 },
      );
    }

    // Atualizar cupom
    const cupom = await prisma.cupom.update({
      where: { codigo: codigo.toUpperCase() },
      data: {
        descontoPorcentagem:
          descontoPorcentagem !== undefined
            ? parseFloat(descontoPorcentagem)
            : undefined,
        validoAte: validoAte ? new Date(validoAte) : null,
        limiteUsos: limiteUsos ? parseInt(limiteUsos) : null,
      },
    });

    revalidatePath("/master/cupons");

    return NextResponse.json({
      success: true,
      message: "Cupom atualizado com sucesso!",
      cupom,
    });
  } catch (error) {
    console.error("Erro ao atualizar cupom:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar cupom" },
      { status: 500 },
    );
  }
}

// DELETE - Excluir cupom
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "master") {
      return NextResponse.json(
        { error: "Acesso negado. Apenas usuários master." },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { codigo } = body;

    if (!codigo) {
      return NextResponse.json(
        { error: "Código do cupom é obrigatório" },
        { status: 400 },
      );
    }

    // Verificar se existe
    const existente = await prisma.cupom.findUnique({
      where: { codigo: codigo.toUpperCase() },
    });

    if (!existente) {
      return NextResponse.json(
        { error: "Cupom não encontrado" },
        { status: 404 },
      );
    }

    // Excluir cupom
    await prisma.cupom.delete({
      where: { codigo: codigo.toUpperCase() },
    });

    revalidatePath("/master/cupons");

    return NextResponse.json({
      success: true,
      message: "Cupom excluído com sucesso!",
    });
  } catch (error) {
    console.error("Erro ao excluir cupom:", error);
    return NextResponse.json(
      { error: "Erro ao excluir cupom" },
      { status: 500 },
    );
  }
}
