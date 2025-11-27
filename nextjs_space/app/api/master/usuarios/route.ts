
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';

// GET - Listar todos os usuários master (apenas master)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'master') {
      return NextResponse.json(
        { error: 'Acesso negado. Apenas usuários master.' },
        { status: 403 }
      );
    }

    const masters = await prisma.user.findMany({
      where: {
        role: 'master',
      },
      select: {
        id: true,
        email: true,
        nome: true,
        name: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(masters);
  } catch (error) {
    console.error('Erro ao buscar usuários master:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar usuários master' },
      { status: 500 }
    );
  }
}

// POST - Criar novo usuário master (apenas master)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'master') {
      return NextResponse.json(
        { error: 'Acesso negado. Apenas usuários master.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { email, senha, nome } = body;

    // Validações
    if (!email || !senha) {
      return NextResponse.json(
        { error: 'Email e senha são obrigatórios' },
        { status: 400 }
      );
    }

    // Verificar se já existe usuário com esse email
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Já existe um usuário com este email' },
        { status: 400 }
      );
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(senha, 10);

    // Criar o usuário master
    const master = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        nome: nome || email.split('@')[0],
        name: nome || email.split('@')[0],
        role: 'master',
        empresaId: null, // Master não pertence a nenhuma empresa
      },
      select: {
        id: true,
        email: true,
        nome: true,
        name: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      {
        message: 'Usuário master criado com sucesso',
        master,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Erro ao criar usuário master:', error);
    return NextResponse.json(
      { error: 'Erro ao criar usuário master' },
      { status: 500 }
    );
  }
}

// DELETE - Excluir usuário master (apenas master)
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'master') {
      return NextResponse.json(
        { error: 'Acesso negado. Apenas usuários master.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('id');

    if (!userId) {
      return NextResponse.json(
        { error: 'ID do usuário é obrigatório' },
        { status: 400 }
      );
    }

    // Verificar se o usuário existe e é master
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      );
    }

    if (user.role !== 'master') {
      return NextResponse.json(
        { error: 'Este usuário não é master' },
        { status: 400 }
      );
    }

    // Não permitir que o usuário exclua a si mesmo
    if (user.id === session.user.id) {
      return NextResponse.json(
        { error: 'Você não pode excluir sua própria conta' },
        { status: 400 }
      );
    }

    // Excluir o usuário
    await prisma.user.delete({
      where: { id: userId },
    });

    return NextResponse.json(
      { message: 'Usuário master excluído com sucesso' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Erro ao excluir usuário master:', error);
    return NextResponse.json(
      { error: 'Erro ao excluir usuário master' },
      { status: 500 }
    );
  }
}
