import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";

export const dynamic = "force-dynamic";

const prisma = new PrismaClient();

/**
 * GET /api/admin/lotes
 * Retorna todos os lotes de um produto específico ou todos os lotes da empresa
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Acesso negado. Apenas administradores" },
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

    const { searchParams } = new URL(request.url);
    const produtoId = searchParams.get("produtoId");

    let lotes;

    if (produtoId) {
      // Buscar lotes de um produto específico
      lotes = await prisma.lote.findMany({
        where: {
          produtoId,
          produto: {
            empresaId,
          },
        },
        include: {
          produto: {
            select: {
              nome: true,
              sku: true,
            },
          },
        },
        orderBy: {
          dataValidade: "asc",
        },
      });
    } else {
      // Buscar todos os lotes da empresa
      lotes = await prisma.lote.findMany({
        where: {
          produto: {
            empresaId,
          },
        },
        include: {
          produto: {
            select: {
              nome: true,
              sku: true,
            },
          },
        },
        orderBy: [{ produto: { nome: "asc" } }, { dataValidade: "asc" }],
      });
    }

    // Verificar lotes vencidos ou próximos do vencimento
    const hoje = new Date();
    const trintaDias = new Date();
    trintaDias.setDate(hoje.getDate() + 30);

    const lotesComStatus = lotes.map((lote: any) => {
      const dataValidade = new Date(lote.dataValidade);
      let status = "normal";

      if (dataValidade < hoje) {
        status = "vencido";
      } else if (dataValidade <= trintaDias) {
        status = "proximo_vencimento";
      }

      return {
        ...lote,
        status,
        diasParaVencer: Math.ceil(
          (dataValidade.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24)
        ),
      };
    });

    return NextResponse.json(lotesComStatus);
  } catch (error) {
    console.error("Erro ao buscar lotes:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/lotes
 * Cria um novo lote e adiciona estoque ao produto
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Acesso negado. Apenas administradores" },
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
    const { produtoId, numeroLote, dataValidade, quantidade } = body;

    // Validações
    if (!produtoId || !numeroLote || !dataValidade || !quantidade) {
      return NextResponse.json(
        { error: "Todos os campos são obrigatórios" },
        { status: 400 }
      );
    }

    if (quantidade <= 0) {
      return NextResponse.json(
        { error: "Quantidade deve ser maior que zero" },
        { status: 400 }
      );
    }

    // Verificar se o produto existe e pertence à empresa
    const product = await prisma.product.findFirst({
      where: {
        id: produtoId,
        empresaId,
      },
    });

    if (!product) {
      return NextResponse.json(
        { error: "Produto não encontrado ou não pertence à sua empresa" },
        { status: 404 }
      );
    }

    // Verificar se a data de validade não está no passado
    const dataValidadeDate = new Date(dataValidade);
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    if (dataValidadeDate < hoje) {
      return NextResponse.json(
        { error: "Data de validade não pode estar no passado" },
        { status: 400 }
      );
    }

    // Criar lote e atualizar estoque em uma transação
    const result = await prisma.$transaction(async (tx: any) => {
      // Criar o lote
      const novoLote = await tx.lote.create({
        data: {
          numeroLote,
          dataValidade: dataValidadeDate,
          quantidade,
          produtoId,
        },
      });

      // Recalcular o estoque total do produto
      const todosLotes = await tx.lote.findMany({
        where: { produtoId },
      });

      const estoqueTotal = todosLotes.reduce(
        (sum: number, lote: any) => sum + lote.quantidade,
        0
      );

      // Atualizar o campo de cache do produto
      await tx.product.update({
        where: { id: produtoId },
        data: { estoqueAtual: estoqueTotal },
      });

      // Criar movimentação de estoque
      await tx.movimentacaoEstoque.create({
        data: {
          produtoId,
          usuarioId: session.user.id,
          empresaId,
          tipo: "ENTRADA",
          quantidade,
          motivo: `Entrada de lote ${numeroLote} - Validade: ${dataValidadeDate.toLocaleDateString(
            "pt-BR"
          )}`,
        },
      });

      return { novoLote, estoqueTotal };
    });

    return NextResponse.json({
      message: "Lote criado com sucesso",
      lote: result.novoLote,
      estoqueAtualizado: result.estoqueTotal,
    });
  } catch (error) {
    console.error("Erro ao criar lote:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/lotes/:id
 * Remove um lote (apenas se quantidade = 0)
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Acesso negado. Apenas administradores" },
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

    const { searchParams } = new URL(request.url);
    const loteId = searchParams.get("id");

    if (!loteId) {
      return NextResponse.json(
        { error: "ID do lote é obrigatório" },
        { status: 400 }
      );
    }

    // Buscar o lote
    const lote = await prisma.lote.findFirst({
      where: {
        id: loteId,
        produto: {
          empresaId,
        },
      },
    });

    if (!lote) {
      return NextResponse.json(
        { error: "Lote não encontrado" },
        { status: 404 }
      );
    }

    if (lote.quantidade > 0) {
      return NextResponse.json(
        {
          error:
            "Não é possível excluir lote com estoque. Quantidade atual: " +
            lote.quantidade,
        },
        { status: 400 }
      );
    }

    // Excluir o lote
    await prisma.lote.delete({
      where: { id: loteId },
    });

    return NextResponse.json({
      message: "Lote excluído com sucesso",
    });
  } catch (error) {
    console.error("Erro ao excluir lote:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
