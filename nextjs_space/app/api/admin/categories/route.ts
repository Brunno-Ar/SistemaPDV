import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.empresaId) {
      return NextResponse.json(
        { error: "Acesso negado ou empresa não identificada" },
        { status: 403 }
      );
    }

    const categories = await prisma.category.findMany({
      where: {
        empresaId: session.user.empresaId,
      },
      orderBy: {
        nome: "asc",
      },
    });

    return NextResponse.json(categories);
  } catch (error) {
    console.error("Erro ao buscar categorias:", error);
    return NextResponse.json(
      { error: "Erro interno ao buscar categorias" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (
      !session?.user ||
      (session.user.role !== "admin" && session.user.role !== "master")
    ) {
      return NextResponse.json(
        {
          error:
            "Acesso negado. Apenas administradores podem criar categorias.",
        },
        { status: 403 }
      );
    }

    const empresaId = session.user.empresaId;

    if (!empresaId) {
      return NextResponse.json(
        { error: "Empresa não identificada" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { nome } = body;

    if (!nome || typeof nome !== "string" || nome.trim() === "") {
      return NextResponse.json(
        { error: "O nome da categoria é obrigatório" },
        { status: 400 }
      );
    }

    // Verificar duplicidade
    const existingCategory = await prisma.category.findFirst({
      where: {
        empresaId,
        nome: {
          equals: nome.trim(),
          mode: "insensitive",
        },
      },
    });

    if (existingCategory) {
      return NextResponse.json(
        { error: "Já existe uma categoria com este nome" },
        { status: 409 }
      );
    }

    const category = await prisma.category.create({
      data: {
        nome: nome.trim(),
        empresaId,
      },
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar categoria:", error);
    return NextResponse.json(
      { error: "Erro interno ao criar categoria" },
      { status: 500 }
    );
  }
}
