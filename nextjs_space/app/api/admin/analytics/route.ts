import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  getBrasiliaStartOfDayInUTC,
  getBrasiliaStartOfWeekInUTC,
  getBrasiliaStartOfMonthInUTC,
  toBrasiliaDate,
  getNowBrasilia,
} from "@/lib/date-utils";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (
      !session?.user ||
      (session.user.role !== "admin" &&
        session.user.role !== "master" &&
        session.user.role !== "gerente")
    ) {
      return NextResponse.json(
        { error: "Acesso negado. Apenas administradores podem acessar." },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(request.url);
    const queryCompanyId = searchParams.get("companyId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    let targetEmpresaId = session.user.empresaId;

    if (queryCompanyId) {
      if (session.user.role !== "master") {
        return NextResponse.json(
          { error: "Acesso Negado: Apenas Master pode filtrar por empresa." },
          { status: 403 },
        );
      }
      targetEmpresaId = queryCompanyId;
    }

    if (!targetEmpresaId) {
      return NextResponse.json(
        { error: "Empresa não identificada." },
        { status: 400 },
      );
    }

    const empresaId = targetEmpresaId;

    // --- 1. DATAS GLOBAIS (Cards Topo) ---
    // Usar aggregations para performance (Hoje, Semana, Mês)
    const queryTodayStart = getBrasiliaStartOfDayInUTC();
    const queryWeekStart = getBrasiliaStartOfWeekInUTC();
    const queryMonthStart = getBrasiliaStartOfMonthInUTC();

    // Queries de Agregação (Totais) - Muito mais leve que puxar tudo
    const [statsHojeSum, statsSemanaSum, statsMesSum] = await Promise.all([
      prisma.sale.aggregate({
        where: { empresaId, dataHora: { gte: queryTodayStart } },
        _count: { id: true },
        _sum: { valorTotal: true },
      }),
      prisma.sale.aggregate({
        where: { empresaId, dataHora: { gte: queryWeekStart } },
        _count: { id: true },
        _sum: { valorTotal: true },
      }),
      prisma.sale.aggregate({
        where: { empresaId, dataHora: { gte: queryMonthStart } },
        _count: { id: true },
        _sum: { valorTotal: true },
      }),
    ]);

    // Queries de Custo/Items (Otimizadas com Select)
    // Precisamos iterar items para ter custo e lucro exatos
    const fetchProfitStats = async (dateStart: Date) => {
      const items = await prisma.saleItem.findMany({
        where: {
          sale: {
            empresaId,
            dataHora: { gte: dateStart },
          },
        },
        select: {
          subtotal: true,
          quantidade: true,
          custoUnitario: true,
        },
      });

      let faturamento = 0;
      let custoTotal = 0;

      items.forEach((item) => {
        faturamento += Number(item.subtotal || 0);
        custoTotal += Number(item.custoUnitario || 0) * item.quantidade;
      });

      const lucro = faturamento - custoTotal;
      const margem = faturamento > 0 ? (lucro / faturamento) * 100 : 0;

      return { faturamento, custoTotal, lucro, margem };
    };

    const [profitHoje, profitSemana, profitMes] = await Promise.all([
      fetchProfitStats(queryTodayStart),
      fetchProfitStats(queryWeekStart),
      fetchProfitStats(queryMonthStart),
    ]);

    // Combinar Stats (Count do aggregate, valores do profit calculation para precisão)
    // Nota: statsHojeSum._sum.valorTotal deve bater com profitHoje.faturamento. Usaremos profit por consistência interna.
    const statsHoje = {
      ...profitHoje,
      transacoes: statsHojeSum._count.id,
    };
    const statsSemana = {
      ...profitSemana,
      transacoes: statsSemanaSum._count.id,
    };
    const statsMes = {
      ...profitMes,
      transacoes: statsMesSum._count.id,
    };

    // --- 2. TIMELINE FINANCEIRA E FILTROS ---
    let timelineStart: Date;
    let timelineEnd: Date;

    if (startDate && endDate) {
      const startParts = startDate.split("-").map(Number);
      const endParts = endDate.split("-").map(Number);

      // Criar datas UTC que correspondem ao inicio do dia BRL (03:00 UTC)
      timelineStart = new Date(
        Date.UTC(startParts[0], startParts[1] - 1, startParts[2], 3, 0, 0),
      );

      // Fim do dia BRL (23:59:59 BRL = 02:59:59 UTC do dia seguinte)
      timelineEnd = new Date(
        Date.UTC(endParts[0], endParts[1] - 1, endParts[2], 3, 0, 0),
      );
      timelineEnd.setDate(timelineEnd.getDate() + 1);
      timelineEnd.setMilliseconds(-1);
    } else {
      // Padrão: Últimos 30 dias (Range fechado D-30 a D-0)
      const nowBRL = getNowBrasilia();
      const endBRL = new Date(nowBRL);

      const startBRL = new Date(nowBRL);
      startBRL.setDate(startBRL.getDate() - 29);

      timelineStart = getBrasiliaStartOfDayInUTC(startBRL);

      const endD = new Date(endBRL);
      endD.setDate(endD.getDate() + 1);
      timelineEnd = getBrasiliaStartOfDayInUTC(endD);
    }

    // Buscar Vendas da Timeline (Otimizado: Select apenas campos necessários)
    const salesTimeline = await prisma.sale.findMany({
      where: {
        empresaId,
        dataHora: {
          gte: timelineStart,
          lte: timelineEnd,
        },
      },
      select: {
        dataHora: true,
        valorTotal: true,
        metodoPagamento: true,
        saleItems: {
          select: {
            subtotal: true,
            custoUnitario: true,
            quantidade: true,
            productId: true,
          },
        },
      },
      orderBy: { dataHora: "asc" },
    });

    // Agrupar por dia (DD/MM)
    const groupedData = new Map<
      string,
      { faturamento: number; custo: number; lucro: number }
    >();

    // Inicializar o mapa (Zero Fill)
    const currentDate = new Date(timelineStart);
    const endDateLoop = new Date(timelineEnd);
    endDateLoop.setMinutes(endDateLoop.getMinutes() + 1); // Margem

    while (currentDate < endDateLoop) {
      const dateBRL = toBrasiliaDate(currentDate);
      const day = String(dateBRL.getUTCDate()).padStart(2, "0");
      const month = String(dateBRL.getUTCMonth() + 1).padStart(2, "0");
      const key = `${day}/${month}`;

      if (!groupedData.has(key)) {
        groupedData.set(key, { faturamento: 0, custo: 0, lucro: 0 });
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Preencher com dados reais
    salesTimeline.forEach((sale) => {
      const dateBRL = toBrasiliaDate(sale.dataHora);
      const day = String(dateBRL.getUTCDate()).padStart(2, "0");
      const month = String(dateBRL.getUTCMonth() + 1).padStart(2, "0");
      const key = `${day}/${month}`;

      if (!groupedData.has(key)) {
        groupedData.set(key, { faturamento: 0, custo: 0, lucro: 0 });
      }

      const stats = groupedData.get(key)!;

      let saleFaturamento = 0;
      let saleCusto = 0;

      sale.saleItems.forEach((item) => {
        saleFaturamento += Number(item.subtotal || 0);
        saleCusto += Number(item.custoUnitario || 0) * item.quantidade;
      });

      stats.faturamento += saleFaturamento;
      stats.custo += saleCusto;
      stats.lucro += saleFaturamento - saleCusto;
    });

    const financialTimeline = Array.from(groupedData.entries()).map(
      ([date, values]) => ({
        date,
        ...values,
      }),
    );

    // --- 3. DADOS SECUNDÁRIOS (Produtos e Métodos) ---
    // Agregação baseada nos dados timeline (já carregados e otimizados)

    // Top Produtos
    const produtosMap = new Map<
      string,
      { nome: string; qtd: number; total: number }
    >();
    const productIds = new Set<string>();

    salesTimeline.forEach((sale) => {
      sale.saleItems.forEach((item) => {
        productIds.add(item.productId);
      });
    });

    // Bulk fetch nomes de produtos
    const products = await prisma.product.findMany({
      where: { id: { in: Array.from(productIds) }, empresaId },
      select: { id: true, nome: true },
    });

    const productNameMap = new Map(products.map((p) => [p.id, p.nome]));

    salesTimeline.forEach((sale) => {
      sale.saleItems.forEach((item) => {
        const current = produtosMap.get(item.productId) || {
          nome: productNameMap.get(item.productId) || "Desconhecido",
          qtd: 0,
          total: 0,
        };
        current.qtd += item.quantidade;
        current.total += Number(item.subtotal || 0);
        produtosMap.set(item.productId, current);
      });
    });

    const produtosMaisVendidosFormatted = Array.from(produtosMap.values())
      .sort((a, b) => b.qtd - a.qtd)
      .slice(0, 10)
      .map((p) => ({
        nome: p.nome,
        totalVendido: p.qtd,
        valorTotal: p.total,
      }));

    // Métodos de Pagamento
    const metodoMap = new Map<string, { count: number; total: number }>();
    salesTimeline.forEach((sale) => {
      const metodo = sale.metodoPagamento;
      const current = metodoMap.get(metodo) || { count: 0, total: 0 };
      current.count += 1;
      current.total += Number(sale.valorTotal || 0);
      metodoMap.set(metodo, current);
    });

    const vendasPorMetodoFormatted = Array.from(metodoMap.entries()).map(
      ([metodo, values]) => ({
        metodo,
        total: values.count,
        valor: values.total,
      }),
    );

    return NextResponse.json({
      // Dados de hoje
      totalVendasHoje: statsHoje.faturamento,
      custoTotalHoje: statsHoje.custoTotal,
      lucroHoje: statsHoje.lucro,
      margemHoje: statsHoje.margem,
      transacoesHoje: statsHoje.transacoes,

      // Dados da semana
      totalVendasSemana: statsSemana.faturamento,
      custoTotalSemana: statsSemana.custoTotal,
      lucroSemana: statsSemana.lucro,
      margemSemana: statsSemana.margem,
      transacoesSemana: statsSemana.transacoes,

      // Dados do mês
      totalVendasMes: statsMes.faturamento,
      custoTotalMes: statsMes.custoTotal,
      lucroMes: statsMes.lucro,
      margemMes: statsMes.margem,
      transacoesMes: statsMes.transacoes,

      // Timeline Financeira
      financialTimeline,

      // Outros dados
      produtosMaisVendidos: produtosMaisVendidosFormatted,
      vendasPorMetodo: vendasPorMetodoFormatted,
    });
  } catch (error) {
    console.error("Erro ao buscar analytics:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
