import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

// GET - Listar membros da equipe da empresa do admin
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (
      !session ||
      (session.user.role !== "admin" && session.user.role !== "master")
    ) {
      return NextResponse.json(
        { error: "Acesso negado. Apenas administradores." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const queryCompanyId = searchParams.get("companyId");

    // 🔥 MODO DEUS: Lógica Híbrida (Sessão vs. Query Param)
    let targetEmpresaId = session.user.empresaId; // Padrão: empresa do usuário logado

    // Se vier um ID na URL, verifica se é MASTER tentando acessar
    if (queryCompanyId) {
      if (session.user.role !== "master") {
        return NextResponse.json(
          { error: "Acesso Negado: Apenas Master pode filtrar por empresa." },
          { status: 403 }
        );
      }
      targetEmpresaId = queryCompanyId; // Sobrescreve o ID alvo
    }

    // Validar que o ID alvo existe
    if (!targetEmpresaId) {
      return NextResponse.json(
        { error: "Empresa não identificada" },
        { status: 400 }
      );
    }

    const empresaId = targetEmpresaId;

    const usuarios = await prisma.user.findMany({
      where: {
        empresaId: empresaId,
        role: {
          not: "master",
        },
      },
      select: {
        id: true,
        email: true,
        nome: true,
        name: true,
        role: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(usuarios);
  } catch (error) {
    console.error("Erro ao buscar equipe:", error);
    return NextResponse.json(
      { error: "Erro ao buscar equipe" },
      { status: 500 }
    );
  }
}

// POST - Criar novo usuário caixa na empresa do admin
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (
      !session ||
      (session.user.role !== "admin" && session.user.role !== "master")
    ) {
      return NextResponse.json(
        { error: "Acesso negado. Apenas administradores." },
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
    const { email, senha, nome } = body;

    // Validações
    if (!email || !senha) {
      return NextResponse.json(
        { error: "Email e senha são obrigatórios" },
        { status: 400 }
      );
    }

    // Verificar se já existe usuário com esse email
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Já existe um usuário com este email" },
        { status: 400 }
      );
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(senha, 10);

    // Criar usuário caixa
    const novoUsuario = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        nome: nome || email.split("@")[0],
        name: nome || email.split("@")[0],
        role: "caixa",
        empresaId: empresaId,
      },
      select: {
        id: true,
        email: true,
        nome: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      {
        message: "Usuário caixa criado com sucesso",
        usuario: novoUsuario,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Erro ao criar usuário:", error);
    return NextResponse.json(
      { error: "Erro ao criar usuário" },
      { status: 500 }
    );
  }
}
// DELETE - Remover usuário da equipe
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (
      !session ||
      (session.user.role !== "admin" && session.user.role !== "master")
    ) {
      return NextResponse.json(
        { error: "Acesso negado. Apenas administradores." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "ID do usuário é obrigatório" },
        { status: 400 }
      );
    }

    if (id === session.user.id) {
      return NextResponse.json(
        { error: "Você não pode excluir sua própria conta" },
        { status: 400 }
      );
    }

    // Verificar se o usuário existe e pertence à empresa
    const userToDelete = await prisma.user.findUnique({
      where: { id },
    });

    if (!userToDelete) {
      return NextResponse.json(
        { error: "Usuário não encontrado" },
        { status: 404 }
      );
    }

    // Se não for master, só pode excluir da própria empresa
    if (
      session.user.role !== "master" &&
      userToDelete.empresaId !== session.user.empresaId
    ) {
      return NextResponse.json(
        { error: "Você não tem permissão para excluir este usuário" },
        { status: 403 }
      );
    }

    await prisma.user.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Usuário excluído com sucesso" });
  } catch (error) {
    console.error("Erro ao excluir usuário:", error);
    return NextResponse.json(
      { error: "Erro ao excluir usuário" },
      { status: 500 }
    );
  }
}
