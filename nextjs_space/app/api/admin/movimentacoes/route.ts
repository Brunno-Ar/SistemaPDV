import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";

export const dynamic = "force-dynamic";

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const empresaId = session.user.empresaId;
    if (!empresaId) {
      return NextResponse.json(
        { error: "Empresa não encontrada" },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
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
