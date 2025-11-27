import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";

export const dynamic = "force-dynamic";

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (
      !session?.user ||
      (session.user.role !== "admin" && session.user.role !== "master")
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

    // Definir períodos
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(
      today.getTime() - today.getDay() * 24 * 60 * 60 * 1000
    );
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Se há filtro de data personalizado
    let dateFilter: any = {
      empresaId: empresaId, // SEMPRE filtrar por empresa
    };
    if (startDate && endDate) {
      // Garantir que as datas cubram o dia inteiro (00:00:00 até 23:59:59)
      // Adicionamos o time e o timezone offset se necessário, mas por enquanto vamos garantir o range de horas
      const start = new Date(`${startDate}T00:00:00.000`);
      const end = new Date(`${endDate}T23:59:59.999`);

      dateFilter.dataHora = {
        gte: start,
        lte: end,
      };
    }

    // Função auxiliar para calcular lucro
    async function calcularLucro(whereCondition: any) {
      // Buscar vendas
      const vendas = await prisma.sale.aggregate({
        where: whereCondition,
        _sum: { valorTotal: true },
        _count: true,
      });

      const faturamento = Number(vendas._sum.valorTotal || 0);

      // Buscar itens de venda com produtos para calcular custo
      const saleItems = await prisma.saleItem.findMany({
        where: {
          sale: whereCondition,
        },
        include: {
          product: {
            select: {
              precoCompra: true,
            },
          },
        },
      });

      // Calcular custo total (quantidade * preço de compra)
      const custoTotal = saleItems.reduce((total: number, item: any) => {
        const custoItem =
          item.quantidade * Number(item.product?.precoCompra || 0);
        return total + custoItem;
      }, 0);

      const lucro = faturamento - custoTotal;
      const margem = faturamento > 0 ? (lucro / faturamento) * 100 : 0;

      return {
        faturamento,
        custoTotal,
        lucro,
        margem,
        transacoes: vendas._count,
      };
    }

    // Vendas hoje
    const resultadoHoje = await calcularLucro({
      empresaId: empresaId,
      dataHora: { gte: today },
    });

    // Vendas semana
    const resultadoSemana = await calcularLucro({
      empresaId: empresaId,
      dataHora: { gte: weekStart },
    });

    // Vendas mês
    const resultadoMes = await calcularLucro({
      empresaId: empresaId,
      dataHora: { gte: monthStart },
    });

    // Produtos mais vendidos (usar filtro de data se fornecido)
    const produtosMaisVendidos = await prisma.saleItem.groupBy({
      by: ["productId"],
      where: {
        sale: {
          empresaId: empresaId, // Filtrar por empresa
          ...(dateFilter.dataHora ? { dataHora: dateFilter.dataHora } : {}),
        },
      },
      _sum: {
        quantidade: true,
        subtotal: true,
      },
      orderBy: {
        _sum: {
          quantidade: "desc",
        },
      },
      take: 10,
    });

    // Buscar nomes dos produtos
    const productIds = produtosMaisVendidos.map((item: any) => item.productId);
    const products = await prisma.product.findMany({
      where: {
        empresaId: empresaId, // Filtrar por empresa
        id: {
          in: productIds,
        },
      },
      select: {
        id: true,
        nome: true,
      },
    });

    const produtosMaisVendidosFormatted = produtosMaisVendidos.map(
      (item: any) => {
        const product = products.find((p: any) => p.id === item.productId);
        return {
          nome: product?.nome || "Produto não encontrado",
          totalVendido: item._sum.quantidade || 0,
          valorTotal: Number(item._sum.subtotal || 0),
        };
      }
    );

    // Vendas por método de pagamento (usar filtro de data se fornecido)
    const vendasPorMetodo = await prisma.sale.groupBy({
      by: ["metodoPagamento"],
      where: {
        empresaId: empresaId, // SEMPRE filtrar por empresa
        ...(dateFilter.dataHora ? { dataHora: dateFilter.dataHora } : {}),
      },
      _sum: {
        valorTotal: true,
      },
      _count: true,
    });

    const vendasPorMetodoFormatted = vendasPorMetodo.map((item: any) => ({
      metodo: item.metodoPagamento,
      total: item._count,
      valor: Number(item._sum.valorTotal || 0),
    }));

    return NextResponse.json({
      // Dados de hoje
      totalVendasHoje: resultadoHoje.faturamento,
      custoTotalHoje: resultadoHoje.custoTotal,
      lucroHoje: resultadoHoje.lucro,
      margemHoje: resultadoHoje.margem,
      transacoesHoje: resultadoHoje.transacoes,

      // Dados da semana
      totalVendasSemana: resultadoSemana.faturamento,
      custoTotalSemana: resultadoSemana.custoTotal,
      lucroSemana: resultadoSemana.lucro,
      margemSemana: resultadoSemana.margem,
      transacoesSemana: resultadoSemana.transacoes,

      // Dados do mês
      totalVendasMes: resultadoMes.faturamento,
      custoTotalMes: resultadoMes.custoTotal,
      lucroMes: resultadoMes.lucro,
      margemMes: resultadoMes.margem,
      transacoesMes: resultadoMes.transacoes,

      // Outros dados
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
