import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

interface SaleItem {
  quantidade: number;
  custoUnitario: number | null; // Prisma Decimal is often mapped to number in runtime or Decimal object
  subtotal: number | null;
}

interface Sale {
  id: string;
  dataHora: Date;
  valorTotal: number | null;
  saleItems: SaleItem[];
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (
      !session?.user ||
      (session.user.role !== "admin" && session.user.role !== "master" && session.user.role !== "gerente")
    ) {
      return NextResponse.json(
        { error: "Acesso negado. Apenas administradores podem acessar." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const queryCompanyId = searchParams.get("companyId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    // 🔥 MODO DEUS: Lógica Híbrida (Sessão vs. Query Param)
    let targetEmpresaId = session.user.empresaId; // Padrão: empresa do usuário logado

    // Se vier um ID na URL, verifica se é MASTER tentando acessar
    if (queryCompanyId) {
      if (session.user.role !== "master") {
        return NextResponse.json(
          { error: "Acesso Negado: Apenas Master pode filtrar por empresa." },
          { status: 403 }
        );
      }
      targetEmpresaId = queryCompanyId; // Sobrescreve o ID alvo
    }

    // Validar que o ID alvo existe
    if (!targetEmpresaId) {
      return NextResponse.json(
        { error: "Empresa não identificada." },
        { status: 400 }
      );
    }

    const empresaId = targetEmpresaId;

    // --- SETUP DE DATAS (UTC-3 Logic) ---
    // Helper para converter UTC para Date em UTC-3 (apenas deslocando o tempo)
    // Para agruparmos corretamente: 22h UTC do dia 1 -> 19h UTC-3 do dia 1.
    // 02h UTC do dia 2 -> 23h UTC-3 do dia 1.
    const toBrasiliaDate = (date: Date) => {
      // Subtrai 3 horas (3 * 60 * 60 * 1000 = 10800000)
      return new Date(date.getTime() - 10800000);
    };

    const now = new Date();
    // Hoje em Brasilia (para comparações de "Hoje")
    const nowBrasilia = toBrasiliaDate(now);
    const todayBrasiliaStr = nowBrasilia.toISOString().split("T")[0]; // YYYY-MM-DD

    // Definir range global para busca no banco
    // Se não tiver filtro, pegamos os últimos 30 dias + hoje para cobrir tudo
    // Se tiver filtro, respeitamos o filtro
    let dbQueryDateFilter: any = {};

    // Datas de análise para os Cards (Hoje, Semana, Mês)
    // Precisamos definir os marcos em UTC para query

    // "Hoje" (Brasilia): De YYYY-MM-DDT03:00:00Z até YYYY-MM-(DD+1)T02:59:59Z
    // Mas simplificando: Vamos buscar um range amplo e filtrar em memória para garantir precisão
    // ou fazer queries específicas.

    // A estratégia aprovada foi: Queries Separadas para os Cards vs Timeline
    // Mas para não explodir o banco, vamos tentar reutilizar se possível,
    // ou fazer queries otimizadas.
    // O usuário disse: "Queries Separadas. Motivo: Se o usuário filtrar a timeline... cards devem mostrar mês todo"
    // OK, então vamos fazer queries separadas para os Cards Globais e para a Timeline.

    // --- 1. CÁLCULO DOS CARDS GLOBAIS (Hoje, Semana, Mês) ---

    // Helper de cálculo estrito em memória
    const calculateStats = (sales: any[]) => {
      let faturamento = 0;
      let custoTotal = 0;

      for (const sale of sales) {
        // Faturamento = Soma dos subtotais (já considera descontos)
        // Se sale.valorTotal existir, usamos ele, ou somamos itens?
        // Instrução: "Faturamento = Soma(SaleItem.subtotal)"
        // Mas Sale.valorTotal deveria bater. Vamos somar itens para ser "Estrito".
        let saleFaturamento = 0;
        let saleCusto = 0;

        for (const item of sale.saleItems) {
          const subtotal = Number(item.subtotal || 0);
          const custoUnit = Number(item.custoUnitario || 0);
          const qtd = item.quantidade;

          saleFaturamento += subtotal;
          saleCusto += (custoUnit * qtd);
        }

        faturamento += saleFaturamento;
        custoTotal += saleCusto;
      }

      const lucro = faturamento - custoTotal;
      const margem = faturamento > 0 ? (lucro / faturamento) * 100 : 0;

      return {
        faturamento,
        custoTotal,
        lucro,
        margem,
        transacoes: sales.length
      };
    };

    // Buscar vendas para Hoje, Semana, Mês
    // Precisamos definir os intervalos em UTC que correspondem ao dia em BRL.
    // Exemplo: Dia 25/10 BRL começa 25/10 00:00 BRL = 25/10 03:00 UTC
    // E termina 25/10 23:59:59 BRL = 26/10 02:59:59 UTC

    const getBrasiliaStartOfDayInUTC = (date: Date) => {
      const d = new Date(date);
      d.setUTCHours(3, 0, 0, 0); // 00:00 BRL = 03:00 UTC
      // Se estamos no horário de verão ou algo assim mudaria, mas BRL é fixo -3 na maioria dos casos agora
      // Ajuste fino: Se o nowBrasilia já é a data ajustada, basta setar as horas
      const year = date.getUTCFullYear();
      const month = date.getUTCMonth();
      const day = date.getUTCDate();
      return new Date(Date.UTC(year, month, day, 3, 0, 0));
    };

    // Datas base (em BRL Time, representadas como Date object)
    const startOfTodayBRL = new Date(nowBrasilia);
    startOfTodayBRL.setUTCHours(0,0,0,0);

    const startOfWeekBRL = new Date(startOfTodayBRL);
    startOfWeekBRL.setDate(startOfTodayBRL.getDate() - startOfTodayBRL.getDay()); // Domingo

    const startOfMonthBRL = new Date(startOfTodayBRL);
    startOfMonthBRL.setDate(1);

    // Converter para UTC Query Point
    const queryTodayStart = getBrasiliaStartOfDayInUTC(startOfTodayBRL);
    const queryWeekStart = getBrasiliaStartOfDayInUTC(startOfWeekBRL);
    const queryMonthStart = getBrasiliaStartOfDayInUTC(startOfMonthBRL);

    // Queries concorrentes
    const [salesHoje, salesSemana, salesMes] = await Promise.all([
      prisma.sale.findMany({
        where: { empresaId, dataHora: { gte: queryTodayStart } },
        include: { saleItems: true }
      }),
      prisma.sale.findMany({
        where: { empresaId, dataHora: { gte: queryWeekStart } },
        include: { saleItems: true }
      }),
      prisma.sale.findMany({
        where: { empresaId, dataHora: { gte: queryMonthStart } },
        include: { saleItems: true }
      })
    ]);

    const statsHoje = calculateStats(salesHoje);
    const statsSemana = calculateStats(salesSemana);
    const statsMes = calculateStats(salesMes);

    // --- 2. TIMELINE FINANCEIRA E FILTROS ---

    // Determinar range da Timeline
    let timelineStart: Date;
    let timelineEnd: Date;

    if (startDate && endDate) {
        // startDate vem como YYYY-MM-DD
        const startParts = startDate.split('-').map(Number);
        const endParts = endDate.split('-').map(Number);

        // Criar datas UTC que correspondem ao inicio do dia BRL (03:00 UTC)
        timelineStart = new Date(Date.UTC(startParts[0], startParts[1]-1, startParts[2], 3, 0, 0));

        // Fim do dia BRL (23:59:59 BRL = 02:59:59 UTC do dia seguinte)
        timelineEnd = new Date(Date.UTC(endParts[0], endParts[1]-1, endParts[2], 3, 0, 0));
        timelineEnd.setDate(timelineEnd.getDate() + 1); // Dia seguinte 03:00 UTC (exclusive)
        timelineEnd.setMilliseconds(-1); // Voltar 1ms
    } else {
        // Padrão: Últimos 30 dias
        timelineEnd = new Date(); // Agora
        timelineStart = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
        // Ajustar para inicio do dia?
        // Vamos pegar o range exato de 30 dias atrás até agora, ou dias fechados?
        // "agrupado por dia (nos últimos 30 dias)"
        // Vamos pegar D-30 00:00 BRL até D-0 23:59 BRL
        const d30 = new Date(startOfTodayBRL);
        d30.setDate(d30.getDate() - 29); // Hoje + 29 dias atrás = 30 dias
        timelineStart = getBrasiliaStartOfDayInUTC(d30);

        const dEnd = new Date(startOfTodayBRL);
        dEnd.setDate(dEnd.getDate() + 1);
        timelineEnd = getBrasiliaStartOfDayInUTC(dEnd); // Fim de hoje
    }

    // Buscar Vendas da Timeline
    const salesTimeline = await prisma.sale.findMany({
        where: {
            empresaId,
            dataHora: {
                gte: timelineStart,
                lte: timelineEnd
            }
        },
        include: { saleItems: true },
        orderBy: { dataHora: 'asc' }
    });

    // Agrupar por dia (DD/MM)
    const groupedData = new Map<string, { faturamento: number; custo: number; lucro: number }>();

    // Inicializar o mapa com todos os dias do intervalo (Zero Fill)
    const currentDate = new Date(timelineStart);
    // Ajuste para loop: vamos iterar em dias BRL
    // timelineStart já é 03:00 UTC.
    // Vamos usar um cursor que avança 24h
    const endDateLoop = new Date(timelineEnd);

    // Pequena margem de segurança para o loop não perder o último dia se houver fração de segundos
    endDateLoop.setMinutes(endDateLoop.getMinutes() + 1);

    while (currentDate < endDateLoop) {
        // Formatar DD/MM
        // Lembre-se: currentDate está em UTC (03:00), que equivale a 00:00 BRL
        // Então getUTCDate() aqui reflete o dia errado se não ajustarmos?
        // Não, 03:00 UTC do dia 10 é dia 10.
        // Espera, 00:00 BRL = 03:00 UTC.
        // Se eu pegar getUTCDate() das 03:00 UTC, dá o dia certo.
        // Se fosse 23:00 BRL = 02:00 UTC (dia seguinte).
        // Então usar o toBrasiliaDate é mais seguro.

        const dateBRL = toBrasiliaDate(currentDate);
        const day = String(dateBRL.getUTCDate()).padStart(2, '0');
        const month = String(dateBRL.getUTCMonth() + 1).padStart(2, '0');
        const key = `${day}/${month}`;

        if (!groupedData.has(key)) {
             groupedData.set(key, { faturamento: 0, custo: 0, lucro: 0 });
        }

        currentDate.setDate(currentDate.getDate() + 1);
    }

    // Preencher com dados reais
    salesTimeline.forEach(sale => {
        const dateBRL = toBrasiliaDate(sale.dataHora);
        const day = String(dateBRL.getUTCDate()).padStart(2, '0');
        const month = String(dateBRL.getUTCMonth() + 1).padStart(2, '0');
        const key = `${day}/${month}`;

        // Se a data estiver fora do range inicializado (pode acontecer se o loop tiver gap), inicializa
        if (!groupedData.has(key)) {
             groupedData.set(key, { faturamento: 0, custo: 0, lucro: 0 });
        }

        const stats = groupedData.get(key)!;

        // Calcular valores desta venda
        let saleFaturamento = 0;
        let saleCusto = 0;

        sale.saleItems.forEach(item => {
            saleFaturamento += Number(item.subtotal || 0);
            saleCusto += (Number(item.custoUnitario || 0) * item.quantidade);
        });

        stats.faturamento += saleFaturamento;
        stats.custo += saleCusto;
        stats.lucro += (saleFaturamento - saleCusto);
    });

    // Converter Map para Array
    const financialTimeline = Array.from(groupedData.entries()).map(([date, values]) => ({
        date,
        ...values
    }));

    // --- 3. DADOS SECUNDÁRIOS (Produtos e Métodos) ---
    // Usar os filtros da Timeline para consistência com o que está sendo visto no gráfico?
    // Ou usar os filtros globais (startDate/endDate da query)?
    // O código original usava startDate/endDate se presentes.
    // Vamos manter essa lógica usando salesTimeline se tiver filtro, ou salesMes se não?
    // Melhor fazer queries dedicadas agregadas, pois performance importa aqui e não precisa de precisão "penny-perfect" de custo histórico (exceto se o cliente quiser muito, mas produtos mais vendidos é soma de qtd).

    // Produtos Mais Vendidos (Top 10)
    // Vamos reutilizar o salesTimeline se ele existir e for filtrado, senão salesMes?
    // O usuário pode querer ver "Produtos mais vendidos desta semana".
    // Se startDate/endDate existem, usamos eles.

    const produtosMap = new Map<string, { nome: string, qtd: number, total: number }>();

    // Dataset para produtos/métodos
    let sourceSalesForDetails = salesTimeline; // Padrão: o que está no filtro/timeline
    if (!startDate && !endDate) {
        // Se não tem filtro, o padrão do original era "Mês" ou "Tudo"?
        // Original: "Produtos mais vendidos ... dateFilter"
        // Se não tinha dateFilter, pegava tudo?
        // Vamos usar salesTimeline (últimos 30 dias) como base se não houver filtro, parece razoável.
    }

    // Como já temos salesTimeline com items, podemos agregar em memória para evitar outra query pesada
    // Se o dataset for muito grande (ex: 1 ano), isso pode ser ruim. Mas limitamos a 30 dias por padrão.

    // Buscar nomes de produtos (precisamos dos nomes, que não estão no SaleItem, só productId)
    // SaleItem tem productId.

    const productIds = new Set<string>();
    sourceSalesForDetails.forEach(sale => {
        sale.saleItems.forEach(item => {
            productIds.add(item.productId);
        });
    });

    const products = await prisma.product.findMany({
        where: { id: { in: Array.from(productIds) }, empresaId },
        select: { id: true, nome: true }
    });

    const productNameMap = new Map(products.map(p => [p.id, p.nome]));

    sourceSalesForDetails.forEach(sale => {
        sale.saleItems.forEach(item => {
            const current = produtosMap.get(item.productId) || { nome: productNameMap.get(item.productId) || 'Desconhecido', qtd: 0, total: 0 };
            current.qtd += item.quantidade;
            current.total += Number(item.subtotal || 0);
            produtosMap.set(item.productId, current);
        });
    });

    const produtosMaisVendidosFormatted = Array.from(produtosMap.values())
        .sort((a, b) => b.qtd - a.qtd)
        .slice(0, 10)
        .map(p => ({
            nome: p.nome,
            totalVendido: p.qtd,
            valorTotal: p.total
        }));

    // Vendas por Método
    const metodoMap = new Map<string, { count: number, total: number }>();
    sourceSalesForDetails.forEach(sale => {
        const metodo = sale.metodoPagamento;
        const current = metodoMap.get(metodo) || { count: 0, total: 0 };
        current.count += 1;
        // Para valor total por método, usamos Sale.valorTotal (que deve bater com soma items)
        // Mas para consistência estrita, usamos a soma dos items que já calculamos?
        // Sale.valorTotal é o que foi pago.
        current.total += Number(sale.valorTotal || 0);
        metodoMap.set(metodo, current);
    });

    const vendasPorMetodoFormatted = Array.from(metodoMap.entries()).map(([metodo, values]) => ({
        metodo,
        total: values.count,
        valor: values.total
    }));

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

      // Timeline Financeira (NOVO)
      financialTimeline,

      // Outros dados (Baseados na Timeline/Filtro)
      produtosMaisVendidos: produtosMaisVendidosFormatted,
      vendasPorMetodo: vendasPorMetodoFormatted,
    });

  } catch (error) {
    console.error("Erro ao buscar analytics:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
