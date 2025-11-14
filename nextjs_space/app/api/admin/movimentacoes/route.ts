
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET - Listar movimentações de estoque da empresa
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

    const movimentacoes = await prisma.movimentacaoEstoque.findMany({
      where: {
        empresaId: empresaId,
      },
      include: {
        produto: {
          select: {
            nome: true,
            sku: true,
          },
        },
        usuario: {
          select: {
            nome: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        dataMovimentacao: 'desc',
      },
      take: 100, // Limitar a 100 registros mais recentes
    });

    return NextResponse.json(movimentacoes);
  } catch (error) {
    console.error('Erro ao buscar movimentações:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar movimentações' },
      { status: 500 }
    );
  }
}

// POST - Criar nova movimentação (entrada ou ajuste)
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
    const usuarioId = session.user.id;

    if (!empresaId) {
      return NextResponse.json(
        { error: 'Empresa não identificada' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { produtoId, tipo, quantidade, motivo } = body;

    // Validações
    if (!produtoId || !tipo || quantidade === undefined || quantidade === 0) {
      return NextResponse.json(
        { error: 'Produto, tipo e quantidade são obrigatórios' },
        { status: 400 }
      );
    }

    // Tipos válidos
    const tiposValidos = ['ENTRADA', 'AJUSTE_QUEBRA', 'AJUSTE_INVENTARIO', 'DEVOLUCAO'];
    if (!tiposValidos.includes(tipo)) {
      return NextResponse.json(
        { error: 'Tipo de movimentação inválido' },
        { status: 400 }
      );
    }

    // Verificar se o produto pertence à empresa
    const produto = await prisma.product.findFirst({
      where: {
        id: produtoId,
        empresaId: empresaId,
      },
    });

    if (!produto) {
      return NextResponse.json(
        { error: 'Produto não encontrado ou não pertence à sua empresa' },
        { status: 404 }
      );
    }

    // Criar movimentação e atualizar estoque em transação
    const result = await prisma.$transaction(async (tx) => {
      // 1. Criar a movimentação
      const movimentacao = await tx.movimentacaoEstoque.create({
        data: {
          produtoId,
          usuarioId,
          empresaId,
          tipo,
          quantidade,
          motivo: motivo || null,
        },
        include: {
          produto: {
            select: {
              nome: true,
              sku: true,
            },
          },
        },
      });

      // 2. Atualizar o estoque do produto
      const novoEstoque = produto.estoqueAtual + quantidade;

      if (novoEstoque < 0) {
        throw new Error('Estoque não pode ficar negativo');
      }

      await tx.product.update({
        where: { id: produtoId },
        data: {
          estoqueAtual: novoEstoque,
        },
      });

      return movimentacao;
    });

    return NextResponse.json(
      {
        message: 'Movimentação registrada com sucesso',
        movimentacao: result,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Erro ao criar movimentação:', error);
    
    if (error.message === 'Estoque não pode ficar negativo') {
      return NextResponse.json(
        { error: 'Estoque não pode ficar negativo' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Erro ao criar movimentação' },
      { status: 500 }
    );
  }
}
