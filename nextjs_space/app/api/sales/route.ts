import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  TransactionClient,
  SaleItemInput,
  Product,
  PaymentInput,
} from "@/types/api";
import { MetodoPagamento } from "@prisma/client";

export const dynamic = "force-dynamic";

// Métodos de pagamento válidos
const VALID_PAYMENT_METHODS = ["dinheiro", "debito", "credito", "pix"] as const;

/**
 * FEFO Engine - First Expired, First Out
 * Desconta a quantidade vendida dos lotes, priorizando os que vencem primeiro
 */
async function descontarLotesFEFO(
  tx: TransactionClient,
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

/**
 * Valida e normaliza os pagamentos
 * Retorna o array de pagamentos normalizado ou null se inválido
 */
function validateAndNormalizePayments(
  payments: PaymentInput[] | undefined,
  metodoPagamento: string | undefined,
  valorTotal: number,
  valorRecebido: number | undefined,
  troco: number | undefined
):
  | {
      normalizedPayments: PaymentInput[];
      hasMultiple: boolean;
      primaryMethod: MetodoPagamento;
      totalTroco: number;
    }
  | { error: string } {
  // CASO 1: Novo formato com array de payments
  if (payments && Array.isArray(payments) && payments.length > 0) {
    // Validar cada pagamento
    for (const payment of payments) {
      if (!payment.method || !VALID_PAYMENT_METHODS.includes(payment.method)) {
        return { error: `Método de pagamento inválido: ${payment.method}` };
      }
      if (typeof payment.amount !== "number" || payment.amount <= 0) {
        return { error: `Valor de pagamento inválido: ${payment.amount}` };
      }
    }

    // Calcular soma dos pagamentos
    const totalPago = payments.reduce((sum, p) => sum + p.amount, 0);

    // Calcular troco (só pode haver troco se tem dinheiro)
    const pagamentoDinheiro = payments.find((p) => p.method === "dinheiro");
    let totalTroco = 0;

    if (pagamentoDinheiro) {
      // Se tem dinheiro, pode haver troco
      const pagamentosSemDinheiro = payments
        .filter((p) => p.method !== "dinheiro")
        .reduce((sum, p) => sum + p.amount, 0);

      const valorRestanteParaDinheiro = valorTotal - pagamentosSemDinheiro;

      if (pagamentoDinheiro.amount > valorRestanteParaDinheiro) {
        totalTroco = pagamentoDinheiro.amount - valorRestanteParaDinheiro;
      }
    }

    // Validar: soma dos pagamentos deve cobrir o total (tolerância de arredondamento)
    const valorEfetivo = totalPago - totalTroco;
    const diferenca = Math.abs(valorEfetivo - valorTotal);

    if (diferenca > 0.01) {
      return {
        error: `Soma dos pagamentos (R$ ${valorEfetivo.toFixed(
          2
        )}) não corresponde ao total da venda (R$ ${valorTotal.toFixed(2)})`,
      };
    }

    // Determinar método primário para campo legacy
    const hasMultiple = payments.length > 1;
    const primaryMethod = hasMultiple
      ? ("dinheiro" as MetodoPagamento) // Fallback, será marcado como COMBINADO na lógica
      : (payments[0].method as MetodoPagamento);

    return {
      normalizedPayments: payments,
      hasMultiple,
      primaryMethod,
      totalTroco,
    };
  }

  // CASO 2: Formato antigo com metodoPagamento (compatibilidade)
  if (
    metodoPagamento &&
    VALID_PAYMENT_METHODS.includes(
      metodoPagamento as (typeof VALID_PAYMENT_METHODS)[number]
    )
  ) {
    // Calcular troco para dinheiro
    let totalTroco = 0;
    let valorPagamento = valorTotal;

    if (metodoPagamento === "dinheiro" && valorRecebido !== undefined) {
      if (valorRecebido < valorTotal) {
        return {
          error: "Valor recebido insuficiente para cobrir o total da venda",
        };
      }
      totalTroco = valorRecebido - valorTotal;
      valorPagamento = valorRecebido;
    }

    return {
      normalizedPayments: [
        {
          method: metodoPagamento as PaymentInput["method"],
          amount: valorPagamento,
        },
      ],
      hasMultiple: false,
      primaryMethod: metodoPagamento as MetodoPagamento,
      totalTroco,
    };
  }

  return { error: "Método de pagamento inválido ou não fornecido" };
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
      // Se for admin ou master, permite vender mesmo sem caixa aberto
      if (session.user.role === "admin" || session.user.role === "master") {
        // Segue o fluxo...
      } else {
        return NextResponse.json(
          { error: "Caixa fechado. Abra o caixa para realizar vendas." },
          { status: 400 }
        );
      }
    }

    const body = await request.json();
    const { items, payments, metodoPagamento, valorRecebido, troco } = body;
    const itemsTyped = items as SaleItemInput[];

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Itens são obrigatórios" },
        { status: 400 }
      );
    }

    // Validar e calcular valor total baseados nos itens
    let valorTotal = 0;
    for (const item of itemsTyped) {
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

    // Validar pagamentos
    const paymentValidation = validateAndNormalizePayments(
      payments,
      metodoPagamento,
      valorTotal,
      valorRecebido,
      troco
    );

    if ("error" in paymentValidation) {
      return NextResponse.json(
        { error: paymentValidation.error },
        { status: 400 }
      );
    }

    const { normalizedPayments, hasMultiple, primaryMethod, totalTroco } =
      paymentValidation;

    // Validar produtos e estoque
    const productIds = itemsTyped.map((item) => item.productId);
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

    for (const item of itemsTyped) {
      const product = products.find((p: Product) => p.id === item.productId);
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

    // Criar venda com transação
    const result = await prisma.$transaction(
      async (tx: TransactionClient) => {
        // Determinar o valor do campo legacy metodoPagamento
        // Se múltiplos métodos, usamos o primeiro como fallback (não temos "COMBINADO" no enum)
        // A lógica de leitura deve priorizar a tabela de payments
        const legacyMethod = hasMultiple
          ? primaryMethod
          : (normalizedPayments[0].method as MetodoPagamento);

        // Calcular valor recebido (soma de todos os pagamentos)
        const totalRecebido = normalizedPayments.reduce(
          (sum, p) => sum + p.amount,
          0
        );

        const sale = await tx.sale.create({
          data: {
            userId: session.user.id,
            empresaId: empresaId,
            valorTotal: valorTotal,
            metodoPagamento: legacyMethod,
            valorRecebido: totalRecebido,
            troco: totalTroco > 0 ? totalTroco : null,
          },
        });

        // Criar registros de pagamento na nova tabela
        for (const payment of normalizedPayments) {
          await tx.salePayment.create({
            data: {
              saleId: sale.id,
              method: payment.method as MetodoPagamento,
              amount: payment.amount,
            },
          });
        }

        // Processar itens da venda
        for (const item of itemsTyped) {
          const product = products.find(
            (p: Product) => p.id === item.productId
          )!;
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

    // Formatar resposta com métodos de pagamento
    const paymentMethodsDisplay = normalizedPayments
      .map((p) => `${p.method}: R$ ${p.amount.toFixed(2)}`)
      .join(", ");

    return NextResponse.json({
      message: "Venda finalizada com sucesso",
      sale: {
        id: result.id,
        valorTotal: Number(result.valorTotal),
        metodoPagamento: hasMultiple ? "COMBINADO" : result.metodoPagamento,
        payments: normalizedPayments,
        troco: totalTroco > 0 ? totalTroco : null,
        dataHora: result.dataHora,
      },
      paymentDetails: paymentMethodsDisplay,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error("Erro detalhado ao finalizar venda:", error);

    let errorMessage = "Erro ao finalizar venda";
    if (error.message) {
      errorMessage = error.message;
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
