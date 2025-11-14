
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';

// GET - Listar membros da equipe da empresa do admin
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || (session.user.role !== 'admin' && session.user.role !== 'master')) {
      return NextResponse.json(
        { error: 'Acesso negado. Apenas administradores.' },
        { status: 403 }
      );
    }

    const empresaId = session.user.empresaId;

    if (!empresaId) {
      return NextResponse.json(
        { error: 'Empresa não identificada' },
        { status: 400 }
      );
    }

    const usuarios = await prisma.user.findMany({
      where: {
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
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(usuarios);
  } catch (error) {
    console.error('Erro ao buscar equipe:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar equipe' },
      { status: 500 }
    );
  }
}

// POST - Criar novo usuário caixa na empresa do admin
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || (session.user.role !== 'admin' && session.user.role !== 'master')) {
      return NextResponse.json(
        { error: 'Acesso negado. Apenas administradores.' },
        { status: 403 }
      );
    }

    const empresaId = session.user.empresaId;

    if (!empresaId) {
      return NextResponse.json(
        { error: 'Empresa não identificada' },
        { status: 400 }
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

    // Criar usuário caixa
    const novoUsuario = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        nome: nome || email.split('@')[0],
        name: nome || email.split('@')[0],
        role: 'caixa',
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
        message: 'Usuário caixa criado com sucesso',
        usuario: novoUsuario,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Erro ao criar usuário:', error);
    return NextResponse.json(
      { error: 'Erro ao criar usuário' },
      { status: 500 }
    );
  }
}
