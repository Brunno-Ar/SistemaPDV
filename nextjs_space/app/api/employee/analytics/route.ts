import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const empresaId = session.user.empresaId;

    if (!empresaId) {
      return NextResponse.json(
        { error: "User not linked to a company" },
        { status: 400 }
      );
    }

    // Ajuste de Timezone para Brasil (UTC-3)
    const nowOriginal = new Date();
    // Subtrai 3 horas para data Brasil
    const nowBrasil = new Date(nowOriginal.getTime() - 3 * 60 * 60 * 1000);

    // Início do dia (Brasil)
    const inicioDiaBrasil = new Date(nowBrasil);
    inicioDiaBrasil.setHours(0, 0, 0, 0);

    // Converte de volta para UTC (soma 3h) para query no banco
    const startOfDay = new Date(inicioDiaBrasil.getTime() + 3 * 60 * 60 * 1000);

    // Início do Mês (Brasil)
    const inicioMesBrasil = new Date(
      nowBrasil.getFullYear(),
      nowBrasil.getMonth(),
      1
    );
    inicioMesBrasil.setHours(0, 0, 0, 0);
    // Converte para UTC
    const startOfMonth = new Date(
      inicioMesBrasil.getTime() + 3 * 60 * 60 * 1000
    );

    // 1. Vendas Hoje
    const salesTodayAgg = await prisma.sale.aggregate({
      where: {
        userId: userId,
        empresaId: empresaId,
        createdAt: {
          gte: startOfDay,
        },
      },
      _sum: {
        valorTotal: true,
      },
      _count: {
        id: true,
      },
    });

    // 2. Vendas Mês
    const salesMonthAgg = await prisma.sale.aggregate({
      where: {
        userId: userId,
        empresaId: empresaId,
        createdAt: {
          gte: startOfMonth,
        },
      },
      _sum: {
        valorTotal: true,
      },
    });

    // 3. Total Itens Vendidos (Mês)
    // Precisamos somar a quantidade dos itens das vendas do mês
    const salesMonthItems = await prisma.saleItem.aggregate({
      where: {
        sale: {
          userId: userId,
          empresaId: empresaId,
          createdAt: {
            gte: startOfMonth,
          },
        },
      },
      _sum: {
        quantidade: true,
      },
    });

    // 4. Últimas 5 Vendas
    const lastSales = await prisma.sale.findMany({
      where: {
        userId: userId,
        empresaId: empresaId,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 5,
      select: {
        id: true,
        valorTotal: true,
        createdAt: true,
      },
    });

    // 5. Weekly Sales (Últimos 7 dias para o gráfico)
    const sevenDaysAgo = new Date(inicioDiaBrasil); // Usa data BR como base
    sevenDaysAgo.setDate(inicioDiaBrasil.getDate() - 6);
    // Converter para UTC query: como inicioDiaBrasil é 00:00 BR, soma 3h = 03:00 UTC
    // Mas o sevenDaysAgo original zerava horas UTC. Vamos manter consistência com 'startOfDay'
    const sevenDaysAgoUTC = new Date(
      sevenDaysAgo.getTime() + 3 * 60 * 60 * 1000
    );

    const weeklySalesRaw = await prisma.sale.findMany({
      where: {
        userId: userId,
        empresaId: empresaId,
        createdAt: {
          gte: sevenDaysAgoUTC,
        },
      },
      select: {
        createdAt: true,
        valorTotal: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    // Agrupar por dia
    const weeklySalesMap = new Map<string, number>();

    // Inicializar os últimos 7 dias com 0
    for (let i = 0; i < 7; i++) {
      const d = new Date(sevenDaysAgo);
      d.setDate(d.getDate() + i);
      const dayKey = d.toLocaleDateString("pt-BR", { weekday: "short" }); // seg., ter.
      // Manter a ordem correta pode ser tricky com Map, vamos usar array depois
      if (!weeklySalesMap.has(dayKey)) {
        weeklySalesMap.set(dayKey, 0);
      }
    }

    // Preencher com dados reais
    weeklySalesRaw.forEach((sale) => {
      // Ajustar data da venda para BR (-3h) antes de pegar o dia da semana
      const saleDateOriginal = new Date(sale.createdAt);
      const saleDateBR = new Date(
        saleDateOriginal.getTime() - 3 * 60 * 60 * 1000
      );

      const dayKey = saleDateBR.toLocaleDateString("pt-BR", {
        weekday: "short",
      });
      const current = weeklySalesMap.get(dayKey) || 0;
      weeklySalesMap.set(dayKey, current + Number(sale.valorTotal));
    });

    // Converter para array no formato do Recharts
    // Nota: O Map itera na ordem de inserção, mas para garantir a ordem cronológica dos dias:
    const weeklySales = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(sevenDaysAgo);
      d.setDate(d.getDate() + i);
      const dayKey = d.toLocaleDateString("pt-BR", { weekday: "short" });
      // Capitalize first letter
      const formattedDay = dayKey.charAt(0).toUpperCase() + dayKey.slice(1);

      weeklySales.push({
        name: formattedDay,
        total: weeklySalesMap.get(dayKey) || 0,
      });
    }

    // 6. Avisos (Mural)
    const avisos = await prisma.aviso.findMany({
      where: {
        empresaId: empresaId,
      },
      orderBy: {
        criadoEm: "desc",
      },
      take: 5,
      select: {
        id: true,
        mensagem: true,
        importante: true,
        criadoEm: true,
      },
    });

    // 7. Meta Mensal
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { metaMensal: true },
    });

    return NextResponse.json({
      salesToday: Number(salesTodayAgg._sum.valorTotal || 0),
      salesMonth: Number(salesMonthAgg._sum.valorTotal || 0),
      totalItemsSold: Number(salesMonthItems._sum.quantidade || 0),
      lastSales: lastSales.map((s) => ({
        ...s,
        valorTotal: Number(s.valorTotal),
      })),
      weeklySales,
      avisos,
      metaMensal: Number(user?.metaMensal || 0),
    });
  } catch (error) {
    console.error("Erro ao buscar analytics do funcionário:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
