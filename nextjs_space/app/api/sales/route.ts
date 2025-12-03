import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * FEFO Engine - First Expired, First Out
 * Desconta a quantidade vendida dos lotes, priorizando os que vencem primeiro
 */
async function descontarLotesFEFO(
  tx: any,
  produtoId: string,
  quantidadeNecessaria: number
): Promise<{
  lotesUsados: string[];
  quantidadeTotal: number;
  custoTotalBaixado: number;
  quantidadeRestante: number;
}> {
  // 1. Buscar lotes ordenados por validade (FEFO)
  const lotes = await tx.lote.findMany({
    where: {
      produtoId: produtoId,
      quantidade: {
        gt: 0,
      },
    },
    orderBy: [
      { dataValidade: "asc" }, // Menor data (mais antiga) primeiro
      { createdAt: "asc" }, // Desempate: lote mais antigo primeiro
    ],
  });

  let quantidadeRestante = quantidadeNecessaria;
  let custoTotalBaixado = 0;
  const lotesUsados: string[] = [];

  // 2. Iterar pelos lotes e descontar
  for (const lote of lotes) {
    if (quantidadeRestante === 0) break;

    const quantidadeADescontar = Math.min(lote.quantidade, quantidadeRestante);
    const custoLote = Number(lote.precoCompra) || 0;

    // Acumular o custo real dos itens retirados deste lote
    custoTotalBaixado += quantidadeADescontar * custoLote;

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

  // Não lança erro se faltar lote, apenas retorna o restante para tratamento
  return {
    lotesUsados,
    quantidadeTotal: quantidadeNecessaria,
    custoTotalBaixado,
    quantidadeRestante,
  };
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

    // Verificar se o caixa está aberto
    const caixaAberto = await prisma.caixa.findFirst({
      where: {
        usuarioId: session.user.id,
        status: "ABERTO",
      },
    });

    if (!caixaAberto) {
      return NextResponse.json(
        { error: "Caixa fechado. Abra o caixa para realizar vendas." },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { items, metodoPagamento, valorRecebido, troco } = body;

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

    // Validar e calcular valor total baseados nos itens
    let valorTotal = 0;
    for (const item of items) {
      if (!item.productId || !item.quantidade || !item.precoUnitario) {
        return NextResponse.json(
          {
            error:
              "Todos os itens devem ter productId, quantidade e preço unitário",
          },
          { status: 400 }
        );
      }

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

    if (valorTotal < 0) {
      return NextResponse.json(
        { error: "Valor total da venda não pode ser negativo" },
        { status: 400 }
      );
    }

    if (metodoPagamento === "dinheiro") {
      if (valorRecebido === undefined || valorRecebido === null) {
        return NextResponse.json(
          { error: "Valor recebido é obrigatório para pagamento em dinheiro" },
          { status: 400 }
        );
      }
      if (Number(valorRecebido) < valorTotal) {
        return NextResponse.json(
          { error: "Valor recebido insuficiente para cobrir o total da venda" },
          { status: 400 }
        );
      }
    }

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

    const result = await prisma.$transaction(
      async (tx: any) => {
        const sale = await tx.sale.create({
          data: {
            userId: session.user.id,
            empresaId: empresaId,
            valorTotal: valorTotal,
            metodoPagamento: metodoPagamento,
            valorRecebido:
              metodoPagamento === "dinheiro" ? valorRecebido : null,
            troco: metodoPagamento === "dinheiro" ? troco : null,
          },
        });

        for (const item of items) {
          const product = products.find((p: any) => p.id === item.productId)!;
          const descontoAplicado = item.descontoAplicado || 0;
          const subtotal =
            item.quantidade * item.precoUnitario - descontoAplicado;

          // *** APLICAR LÓGICA FEFO ***
          const { lotesUsados, custoTotalBaixado, quantidadeRestante } =
            await descontarLotesFEFO(tx, item.productId, item.quantidade);

          // Se sobrar quantidade (sem lote), usamos o preço de compra do produto como custo
          let custoFinal = custoTotalBaixado;
          if (quantidadeRestante > 0) {
            const custoFallback = Number(product.precoCompra) || 0;
            custoFinal += quantidadeRestante * custoFallback;
            lotesUsados.push(`Sem Lote (${quantidadeRestante} un)`);
          }

          const custoUnitarioReal =
            custoFinal > 0
              ? custoFinal / item.quantidade
              : Number(product.precoCompra);

          await tx.saleItem.create({
            data: {
              saleId: sale.id,
              productId: item.productId,
              quantidade: item.quantidade,
              precoUnitario: item.precoUnitario,
              custoUnitario: custoUnitarioReal,
              descontoAplicado: descontoAplicado,
              subtotal: subtotal,
            },
          });

          await tx.product.update({
            where: { id: item.productId },
            data: {
              estoqueAtual: {
                decrement: item.quantidade,
              },
            },
          });

          await tx.movimentacaoEstoque.create({
            data: {
              produtoId: item.productId,
              usuarioId: session.user.id,
              empresaId: empresaId,
              tipo: "VENDA",
              quantidade: -item.quantidade,
              motivo: `Venda #${sale.id.substring(
                0,
                8
              )} - Lotes: ${lotesUsados.join(", ")}`,
            },
          });
        }

        return sale;
      },
      {
        maxWait: 5000,
        timeout: 20000,
      }
    );

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
  }
}
