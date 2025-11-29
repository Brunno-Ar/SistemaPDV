import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const companyIdParam = searchParams.get("companyId");

    let empresaId = session.user.empresaId;

    // Se for master e tiver companyId na query, usa o da query
    if (session.user.role === "master" && companyIdParam) {
      empresaId = companyIdParam;
    }

    if (!empresaId) {
      return NextResponse.json(
        { error: "Empresa não encontrada" },
        { status: 400 }
      );
    }

    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const type = searchParams.get("type"); // 'VENDA', 'ENTRADA', 'PERDA', 'AJUSTE', 'TODOS'

    // Filtro de Data
    const dateFilter: any = {};
    if (startDate && endDate) {
      dateFilter.gte = new Date(startDate);
      dateFilter.lte = new Date(endDate);
      // Ajustar para o final do dia
      dateFilter.lte.setHours(23, 59, 59, 999);
    }

    // 1. Buscar Vendas (Se o tipo for TODOS ou VENDA)
    let sales: any[] = [];
    if (!type || type === "TODOS" || type === "VENDA") {
      sales = await prisma.sale.findMany({
        where: {
          empresaId,
          dataHora: startDate && endDate ? dateFilter : undefined,
        },
        include: {
          user: {
            select: { name: true, email: true },
          },
          saleItems: {
            include: {
              product: {
                select: { nome: true, sku: true },
              },
            },
          },
        },
        orderBy: { dataHora: "desc" },
      });
    }

    // 2. Buscar Movimentações de Estoque (Se o tipo for TODOS ou OUTROS)
    // Mapeamento de filtros do frontend para tipos do banco
    let stockMovementTypes: any = undefined;
    if (type && type !== "TODOS" && type !== "VENDA") {
      if (type === "ENTRADA") stockMovementTypes = "ENTRADA";
      if (type === "PERDA") stockMovementTypes = "AJUSTE_QUEBRA"; // Assumindo que PERDA = AJUSTE_QUEBRA
      if (type === "AJUSTE") stockMovementTypes = "AJUSTE_INVENTARIO";
    }

    let movements: any[] = [];
    if (!type || type === "TODOS" || type !== "VENDA") {
      movements = await prisma.movimentacaoEstoque.findMany({
        where: {
          empresaId,
          tipo: stockMovementTypes ? stockMovementTypes : { not: "VENDA" }, // Ignora vendas aqui pois já buscamos na tabela Sale
          dataMovimentacao: startDate && endDate ? dateFilter : undefined,
        },
        include: {
          produto: {
            select: { nome: true, sku: true },
          },
          usuario: {
            select: { name: true, email: true },
          },
        },
        orderBy: { dataMovimentacao: "desc" },
      });
    }

    // 3. Unificar e Padronizar
    const unifiedTimeline = [
      ...sales.map((sale) => ({
        id: sale.id,
        type: "VENDA",
        date: sale.dataHora,
        user: sale.user?.name || "Desconhecido",
        totalValue: Number(sale.valorTotal),
        items: sale.saleItems.map((item: any) => ({
          productName: item.product.nome,
          quantity: item.quantidade,
          unitPrice: Number(item.precoUnitario),
          subtotal: Number(item.subtotal),
          discount: Number(item.descontoAplicado || 0),
        })),
        paymentMethod: sale.metodoPagamento,
      })),
      ...movements.map((mov) => ({
        id: mov.id,
        type: mov.tipo, // ENTRADA, AJUSTE_QUEBRA, etc.
        date: mov.dataMovimentacao,
        user: mov.usuario?.name || "Desconhecido",
        productName: mov.produto.nome,
        quantity: mov.quantidade,
        reason: mov.motivo,
      })),
    ];

    // 4. Ordenar por Data (Decrescente)
    unifiedTimeline.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    return NextResponse.json(unifiedTimeline);
  } catch (error) {
    console.error("Erro ao buscar movimentações:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/movimentacoes
 * Cria uma nova movimentação manual (Ajuste, Entrada, Perda)
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
    const { produtoId, loteId, tipo, quantidade, motivo } = body;

    // Validações básicas
    if (!produtoId || !tipo || !quantidade) {
      return NextResponse.json(
        { error: "Produto, Tipo e Quantidade são obrigatórios" },
        { status: 400 }
      );
    }

    const qtd = Number(quantidade);
    if (isNaN(qtd) || qtd <= 0) {
      return NextResponse.json(
        { error: "Quantidade deve ser um número positivo" },
        { status: 400 }
      );
    }

    // Validação Estrita de Lote para Saídas/Perdas
    if ((tipo === "SAIDA" || tipo === "AJUSTE_QUEBRA") && !loteId) {
      return NextResponse.json(
        {
          error:
            "É obrigatório selecionar um Lote para registrar saídas ou perdas.",
        },
        { status: 400 }
      );
    }

    // Determinar sinal da operação
    let multiplier = 1;
    if (tipo === "AJUSTE_QUEBRA" || tipo === "SAIDA") {
      multiplier = -1;
    }
    // Se for AJUSTE_INVENTARIO, depende do contexto, mas geralmente aqui vamos assumir que o usuário manda o valor absoluto e o tipo define se entra ou sai.
    // Mas para simplificar, vamos assumir:
    // ENTRADA: +
    // AJUSTE_QUEBRA (Perda): -
    // AJUSTE_INVENTARIO (Correção): Pode ser + ou -.
    // Vamos simplificar: O frontend manda o tipo.
    // Se for ENTRADA -> +
    // Se for SAIDA (Custom type, mapeado para AJUSTE_INVENTARIO ou similar) -> -
    // Se for PERDA (AJUSTE_QUEBRA) -> -

    // Vamos usar os tipos do Prisma: ENTRADA, AJUSTE_QUEBRA, AJUSTE_INVENTARIO, DEVOLUCAO, VENDA
    // Mapeamento lógico:
    // ENTRADA -> +
    // AJUSTE_QUEBRA -> -
    // DEVOLUCAO -> +
    // AJUSTE_INVENTARIO -> Pode ser + ou -. O usuário deve especificar se é entrada ou saída no frontend, ou mandamos o sinal na quantidade?
    // Vamos assumir que o frontend manda a quantidade POSITIVA e o tipo define o sinal.
    // Para AJUSTE_INVENTARIO, vamos precisar de um subtipo ou sinal explícito.
    // Vamos assumir que AJUSTE_INVENTARIO recebido aqui será tratado como "Correção Manual".
    // Se o usuário quiser tirar, ele usa "SAIDA" (que não existe no enum, então usaremos AJUSTE_INVENTARIO com valor negativo).

    // Melhor: O frontend manda "operacao": "ADICIONAR" | "REMOVER"
    const operacao = body.operacao || "ADICIONAR";
    if (operacao === "REMOVER") multiplier = -1;

    const delta = qtd * multiplier;

    // Transação
    const result = await prisma.$transaction(async (tx: any) => {
      // 1. Verificar Produto
      const produto = await tx.product.findFirst({
        where: { id: produtoId, empresaId },
      });

      if (!produto) throw new Error("Produto não encontrado");

      // 2. Se tiver Lote, atualizar Lote
      let loteInfo = "";
      if (loteId) {
        const lote = await tx.lote.findFirst({
          where: { id: loteId, produtoId },
        });

        if (!lote) throw new Error("Lote não encontrado");

        // Verificar estoque negativo no lote
        if (lote.quantidade + delta < 0) {
          throw new Error(
            `Estoque insuficiente no lote. Disponível: ${lote.quantidade}`
          );
        }

        await tx.lote.update({
          where: { id: loteId },
          data: { quantidade: { increment: delta } },
        });
        loteInfo = ` (Lote: ${lote.numeroLote})`;
      } else {
        // Se não tem lote, verificar estoque negativo no produto geral (opcional, mas recomendado)
        if (produto.estoqueAtual + delta < 0) {
          // Permitir negativo? Geralmente não.
          throw new Error(
            `Estoque insuficiente. Disponível: ${produto.estoqueAtual}`
          );
        }
      }

      // 3. Atualizar Produto
      await tx.product.update({
        where: { id: produtoId },
        data: { estoqueAtual: { increment: delta } },
      });

      // 4. Criar Movimentação
      const mov = await tx.movimentacaoEstoque.create({
        data: {
          produtoId,
          usuarioId: session.user.id,
          empresaId,
          tipo: tipo, // ENTRADA, AJUSTE_QUEBRA, AJUSTE_INVENTARIO
          quantidade: delta,
          motivo: `${motivo || "Ajuste manual"}${loteInfo}`,
          loteId: loteId || null,
        },
      });

      return mov;
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Erro ao criar movimentação:", error);
    return NextResponse.json(
      { error: error.message || "Erro interno do servidor" },
      { status: 400 }
    );
  }
}
