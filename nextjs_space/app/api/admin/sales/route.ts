import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

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

    // Filtro de data se fornecido - SEMPRE incluir empresaId
    let dateFilter: any = {
      empresaId: empresaId, // SEMPRE filtrar por empresa
    };
    if (startDate && endDate) {
      const start = new Date(`${startDate}T00:00:00.000`);
      const end = new Date(`${endDate}T23:59:59.999`);

      dateFilter.dataHora = {
        gte: start,
        lte: end,
      };
    }

    const sales = await prisma.sale.findMany({
      where: dateFilter,
      include: {
        user: {
          select: {
            nome: true,
            name: true,
          },
        },
        saleItems: {
          include: {
            product: {
              select: {
                precoCompra: true,
              },
            },
          },
        },
      },
      orderBy: {
        dataHora: "desc",
      },
      take: 50, // Limitar a 50 vendas mais recentes
    });

    // Converter Decimal para number, calcular lucro e formatar dados
    const salesFormatted = sales.map((sale: any) => {
      const valorTotal = Number(sale.valorTotal);

      // Calcular custo total da venda
      const custoTotal = sale.saleItems.reduce((total: number, item: any) => {
        const custoItem =
          item.quantidade * Number(item.product?.precoCompra || 0);
        return total + custoItem;
      }, 0);

      const lucro = valorTotal - custoTotal;
      const margem = valorTotal > 0 ? (lucro / valorTotal) * 100 : 0;

      return {
        id: sale.id,
        dataHora: sale.dataHora.toISOString(),
        valorTotal,
        custoTotal,
        lucro,
        margem,
        metodoPagamento: sale.metodoPagamento,
        user: {
          nome: sale.user?.nome || sale.user?.name || "N/A",
        },
      };
    });

    return NextResponse.json(salesFormatted);
  } catch (error) {
    console.error("Erro ao buscar vendas:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
