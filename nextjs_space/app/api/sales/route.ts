import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * FEFO Engine - First Expired, First Out
 * Desconta a quantidade vendida dos lotes, priorizando os que vencem primeiro
 */
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

  // 4. Verificar se conseguiu descontar tudo
  if (quantidadeRestante > 0) {
    throw new Error(
      `Estoque insuficiente nos lotes cadastrados. Faltam ${quantidadeRestante} unidades. Verifique se há lotes cadastrados para este produto.`
    );
  }

  return {
    lotesUsados,
    quantidadeTotal: quantidadeNecessaria,
    custoTotalBaixado,
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
    const result = await prisma.$transaction(
      async (tx: any) => {
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

          // *** APLICAR LÓGICA FEFO PRIMEIRO ***
          // Para saber o custo real dos lotes que serão consumidos
          const { lotesUsados, custoTotalBaixado } = await descontarLotesFEFO(
            tx,
            item.productId,
            item.quantidade
          );

          // Calcular custo unitário médio real desta venda
          // Se por algum motivo o custoTotal for 0 (ex: lotes sem custo cadastrado), usa o custo do produto como fallback
          const custoUnitarioReal =
            custoTotalBaixado > 0
              ? custoTotalBaixado / item.quantidade
              : Number(product.precoCompra);

          // Criar item da venda com o CUSTO REAL
          await tx.saleItem.create({
            data: {
              saleId: sale.id,
              productId: item.productId,
              quantidade: item.quantidade,
              precoUnitario: item.precoUnitario,
              custoUnitario: custoUnitarioReal, // AGORA SIM: Custo preciso baseado nos lotes
              descontoAplicado: descontoAplicado,
              subtotal: subtotal,
            },
          });

          // Atualizar estoque do produto (decremento atômico)
          await tx.product.update({
            where: { id: item.productId },
            data: {
              estoqueAtual: {
                decrement: item.quantidade,
              },
            },
          });

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
      },
      {
        maxWait: 5000, // Tempo máximo de espera para iniciar a transação
        timeout: 20000, // Tempo máximo para execução da transação (20s)
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
