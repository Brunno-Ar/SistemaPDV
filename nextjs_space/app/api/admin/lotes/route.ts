import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

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
              estoqueMinimo: true,
              estoqueAtual: true,
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
              estoqueMinimo: true,
              estoqueAtual: true,
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
      let status = "sem_validade";
      let diasParaVencer = null;

      if (lote.quantidade === 0) {
        status = "esgotado";
      } else if (lote.dataValidade) {
        const dataValidade = new Date(lote.dataValidade);
        status = "normal";

        if (dataValidade < hoje) {
          status = "vencido";
        } else if (dataValidade <= trintaDias) {
          status = "proximo_vencimento";
        }

        diasParaVencer = Math.ceil(
          (dataValidade.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24)
        );
      }

      return {
        ...lote,
        status,
        diasParaVencer,
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
    const { produtoId, numeroLote, dataValidade, quantidade, precoCompra } =
      body;

    // Validações
    if (!produtoId || !quantidade) {
      return NextResponse.json(
        { error: "Produto e Quantidade são obrigatórios" },
        { status: 400 }
      );
    }

    // Gerar número do lote se não fornecido
    let finalNumeroLote = numeroLote;
    if (!finalNumeroLote || finalNumeroLote.trim() === "") {
      const date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const random = Math.floor(Math.random() * 10000)
        .toString()
        .padStart(4, "0");
      finalNumeroLote = `LOTE${year}${month}${day}-${random}`;
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

    // Validar data de validade APENAS SE FORNECIDA
    let dataValidadeDate: Date | null = null;
    if (dataValidade) {
      dataValidadeDate = new Date(dataValidade);
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      if (dataValidadeDate < hoje) {
        return NextResponse.json(
          { error: "Data de validade não pode estar no passado" },
          { status: 400 }
        );
      }
    }

    const custoLote = Number(precoCompra || 0);

    // Criar lote e atualizar estoque em uma transação
    const result = await prisma.$transaction(async (tx: any) => {
      // 1. Calcular Custo Médio Ponderado
      // Fórmula: ((QtdAtual * CustoAtual) + (QtdLote * CustoLote)) / (QtdAtual + QtdLote)
      const qtdAtual = product.estoqueAtual;
      const custoAtual = Number(product.precoCompra);

      let novoCustoMedio = custoAtual;
      const novaQtdTotal = qtdAtual + quantidade;

      if (novaQtdTotal > 0) {
        novoCustoMedio =
          (qtdAtual * custoAtual + quantidade * custoLote) / novaQtdTotal;
      }

      // 2. Criar o lote
      const novoLote = await tx.lote.create({
        data: {
          numeroLote: finalNumeroLote,
          dataValidade: dataValidadeDate,
          quantidade,
          produtoId,
          precoCompra: custoLote,
        },
      });

      // 3. Atualizar Produto (Estoque e Custo Médio)
      await tx.product.update({
        where: { id: produtoId },
        data: {
          estoqueAtual: novaQtdTotal,
          precoCompra: novoCustoMedio,
        },
      });

      // 4. Criar movimentação de estoque
      await tx.movimentacaoEstoque.create({
        data: {
          produtoId,
          usuarioId: session.user.id,
          empresaId,
          tipo: "ENTRADA",
          quantidade,
          motivo: `Entrada de lote ${finalNumeroLote} - Custo: R$${custoLote.toFixed(
            2
          )}`,
        },
      });

      return { novoLote, estoqueTotal: novaQtdTotal };
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

/**
 * PUT /api/admin/lotes
 * Atualiza um lote existente
 */
export async function PUT(request: NextRequest) {
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
    const { id, numeroLote, dataValidade, quantidade } = body;

    if (!id) {
      return NextResponse.json(
        { error: "ID do lote é obrigatório" },
        { status: 400 }
      );
    }

    // Buscar o lote atual
    const loteAtual = await prisma.lote.findFirst({
      where: {
        id,
        produto: {
          empresaId,
        },
      },
      include: {
        produto: true,
      },
    });

    if (!loteAtual) {
      return NextResponse.json(
        { error: "Lote não encontrado" },
        { status: 404 }
      );
    }

    // Validar nova quantidade
    const novaQuantidade = parseInt(quantidade);
    if (isNaN(novaQuantidade) || novaQuantidade < 0) {
      return NextResponse.json(
        { error: "Quantidade inválida" },
        { status: 400 }
      );
    }

    // Validar nova data
    let novaDataValidade: Date | null = null;
    if (dataValidade) {
      novaDataValidade = new Date(dataValidade);
    }

    // Calcular diferença de quantidade
    const diferencaQuantidade = novaQuantidade - loteAtual.quantidade;

    // Atualizar em transação
    const result = await prisma.$transaction(async (tx: any) => {
      // 1. Atualizar o lote
      const loteAtualizado = await tx.lote.update({
        where: { id },
        data: {
          numeroLote,
          dataValidade: novaDataValidade,
          quantidade: novaQuantidade,
        },
      });

      // 2. Se houve mudança na quantidade, atualizar estoque do produto e registrar movimentação
      if (diferencaQuantidade !== 0) {
        await tx.product.update({
          where: { id: loteAtual.produtoId },
          data: {
            estoqueAtual: {
              increment: diferencaQuantidade,
            },
          },
        });

        await tx.movimentacaoEstoque.create({
          data: {
            produtoId: loteAtual.produtoId,
            usuarioId: session.user.id,
            empresaId,
            tipo: "AJUSTE_INVENTARIO",
            quantidade: diferencaQuantidade,
            motivo: `Edição manual do lote ${numeroLote}. Ajuste: ${
              diferencaQuantidade > 0 ? "+" : ""
            }${diferencaQuantidade}`,
          },
        });
      }

      return loteAtualizado;
    });

    return NextResponse.json({
      message: "Lote atualizado com sucesso",
      lote: result,
    });
  } catch (error) {
    console.error("Erro ao atualizar lote:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
