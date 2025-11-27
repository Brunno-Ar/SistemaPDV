import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";

export const dynamic = "force-dynamic";

const prisma = new PrismaClient();

/**
 * FEFO Engine - First Expired, First Out
 * Desconta a quantidade vendida dos lotes, priorizando os que vencem primeiro
 */
async function descontarLotesFEFO(
  tx: any,
  produtoId: string,
  quantidadeNecessaria: number
): Promise<{ lotesUsados: string[]; quantidadeTotal: number }> {
  // 1. Buscar todos os lotes do produto com estoque disponível, ordenados por validade
  const lotes = await tx.lote.findMany({
    where: {
      produtoId: produtoId,
      quantidade: {
        gt: 0,
      },
    },
    orderBy: {
      dataValidade: "asc", // FEFO: Os que vencem primeiro saem primeiro (Nulos ficam por último no Postgres ASC)
    },
  });

  // 🔥 FIX: Se não há lotes, criar um lote genérico para produtos legados
  if (lotes.length === 0) {
    const produto = await tx.product.findUnique({
      where: { id: produtoId },
    });

    if (!produto || produto.estoqueAtual < quantidadeNecessaria) {
      throw new Error("Estoque insuficiente para este produto");
    }

    // Criar lote automático para produto sem sistema de lotes
    const dataAtual = new Date();
    const dataFormatada = dataAtual
      .toISOString()
      .split("T")[0]
      .replace(/-/g, "");
    const numeroAleatorio = Math.floor(Math.random() * 99999)
      .toString()
      .padStart(5, "0");
    const numeroLote = `LOTE-AUTO-${dataFormatada}-${numeroAleatorio}`;

    // Data de validade: null (indefinida) ou 1 ano? Vamos usar null se opcional, ou manter 1 ano.
    // O prompt diz "Torne dataValidade opcional". Vamos usar null para produtos sem validade explícita.
    // Mas para o lote automático, talvez seja melhor null.

    const loteAutomatico = await tx.lote.create({
      data: {
        numeroLote,
        dataValidade: null, // Sem validade definida
        quantidade: produto.estoqueAtual,
        produtoId: produtoId,
        precoCompra: produto.precoCompra, // Copiar custo atual
      },
    });

    lotes.push(loteAutomatico);
  }

  let quantidadeRestante = quantidadeNecessaria;
  const lotesUsados: string[] = [];

  // 2. Iterar pelos lotes e descontar a quantidade necessária
  for (const lote of lotes) {
    if (quantidadeRestante === 0) break;

    const quantidadeADescontar = Math.min(lote.quantidade, quantidadeRestante);

    // 3. Atualizar o lote
    await tx.lote.update({
      where: { id: lote.id },
      data: {
        quantidade: lote.quantidade - quantidadeADescontar,
      },
    });

    quantidadeRestante -= quantidadeADescontar;
    lotesUsados.push(`${lote.numeroLote} (${quantidadeADescontar} un)`);
  }

  // 4. Verificar se conseguiu descontar tudo
  if (quantidadeRestante > 0) {
    throw new Error(
      `Estoque insuficiente nos lotes. Faltam ${quantidadeRestante} unidades`
    );
  }

  return {
    lotesUsados,
    quantidadeTotal: quantidadeNecessaria,
  };
}

/**
 * Recalcula o estoque atual do produto baseado na soma de todos os lotes
 */
async function recalcularEstoqueCache(
  tx: any,
  produtoId: string
): Promise<number> {
  const lotes = await tx.lote.findMany({
    where: { produtoId },
  });

  const estoqueTotal = lotes.reduce(
    (sum: number, lote: any) => sum + lote.quantidade,
    0
  );

  await tx.product.update({
    where: { id: produtoId },
    data: { estoqueAtual: estoqueTotal },
  });

  return estoqueTotal;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const empresaId = session.user.empresaId;

    if (!empresaId) {
      return NextResponse.json(
        { error: "Empresa não identificada" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { items, metodoPagamento } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Itens são obrigatórios" },
        { status: 400 }
      );
    }

    if (
      !metodoPagamento ||
      !["dinheiro", "debito", "credito", "pix"].includes(metodoPagamento)
    ) {
      return NextResponse.json(
        { error: "Método de pagamento inválido" },
        { status: 400 }
      );
    }

    // Validar e calcular valor total baseado nos itens (preço * quantidade - desconto)
    let valorTotal = 0;
    for (const item of items) {
      // Validar campos obrigatórios
      if (!item.productId || !item.quantidade || !item.precoUnitario) {
        return NextResponse.json(
          {
            error:
              "Todos os itens devem ter productId, quantidade e preço unitário",
          },
          { status: 400 }
        );
      }

      // Validar valores numéricos
      if (item.quantidade <= 0 || item.precoUnitario < 0) {
        return NextResponse.json(
          {
            error:
              "Quantidade deve ser maior que zero e preço não pode ser negativo",
          },
          { status: 400 }
        );
      }

      const itemTotal =
        item.precoUnitario * item.quantidade - (item.descontoAplicado || 0);
      valorTotal += itemTotal;
    }

    // Validar valor total
    if (valorTotal <= 0) {
      return NextResponse.json(
        { error: "Valor total da venda deve ser maior que zero" },
        { status: 400 }
      );
    }

    // Verificar estoque e buscar produtos (apenas da empresa do usuário)
    const productIds = items.map((item: any) => item.productId);
    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        empresaId: empresaId,
      },
    });

    if (products.length !== productIds.length) {
      return NextResponse.json(
        { error: "Produtos não encontrados ou não pertencem à sua empresa" },
        { status: 400 }
      );
    }

    // Verificar se há estoque suficiente para todos os itens
    for (const item of items) {
      const product = products.find((p: any) => p.id === item.productId);
      if (!product) {
        return NextResponse.json(
          { error: `Produto não encontrado: ${item.productId}` },
          { status: 400 }
        );
      }

      if (product.estoqueAtual < item.quantidade) {
        return NextResponse.json(
          {
            error: `Estoque insuficiente para ${product.nome}. Disponível: ${product.estoqueAtual}`,
          },
          { status: 400 }
        );
      }
    }

    // Criar a transação de venda com lógica FEFO
    const result = await prisma.$transaction(async (tx: any) => {
      // Criar a venda
      const sale = await tx.sale.create({
        data: {
          userId: session.user.id,
          empresaId: empresaId,
          valorTotal: valorTotal,
          metodoPagamento: metodoPagamento,
        },
      });

      // Criar os itens da venda, aplicar FEFO e atualizar estoque
      for (const item of items) {
        const product = products.find((p: any) => p.id === item.productId)!;
        const descontoAplicado = item.descontoAplicado || 0;
        const subtotal =
          item.quantidade * item.precoUnitario - descontoAplicado;

        // Criar item da venda
        await tx.saleItem.create({
          data: {
            saleId: sale.id,
            productId: item.productId,
            quantidade: item.quantidade,
            precoUnitario: item.precoUnitario,
            custoUnitario: product.precoCompra, // SNAPSHOT DO CUSTO
            descontoAplicado: descontoAplicado,
            subtotal: subtotal,
          },
        });

        // *** APLICAR LÓGICA FEFO ***
        // Descontar dos lotes com vencimento mais próximo
        const { lotesUsados } = await descontarLotesFEFO(
          tx,
          item.productId,
          item.quantidade
        );

        // Recalcular o estoque total do produto (cache)
        const novoEstoque = await recalcularEstoqueCache(tx, item.productId);

        // Criar movimentação de estoque com informação dos lotes
        await tx.movimentacaoEstoque.create({
          data: {
            produtoId: item.productId,
            usuarioId: session.user.id,
            empresaId: empresaId,
            tipo: "VENDA",
            quantidade: -item.quantidade, // Negativo porque é saída
            motivo: `Venda #${sale.id.substring(
              0,
              8
            )} - Lotes: ${lotesUsados.join(", ")}`,
          },
        });
      }

      return sale;
    });

    return NextResponse.json({
      message: "Venda finalizada com sucesso",
      sale: {
        id: result.id,
        valorTotal: Number(result.valorTotal),
        metodoPagamento: result.metodoPagamento,
        dataHora: result.dataHora,
      },
    });
  } catch (error: any) {
    console.error("Erro detalhado ao finalizar venda:", error);

    let errorMessage = "Erro ao finalizar venda";
    if (error.message) {
      errorMessage = error.message;
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
