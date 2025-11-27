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
    const queryCompanyId = searchParams.get("companyId");

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
        { error: "Empresa não identificada" },
        { status: 400 }
      );
    }

    const empresaId = targetEmpresaId;

    // Buscar vendas com seus itens
    const vendas = await prisma.sale.findMany({
      where: {
        empresaId: empresaId,
      },
      include: {
        user: {
          select: {
            nome: true,
            name: true,
            email: true,
          },
        },
        saleItems: {
          include: {
            product: {
              select: {
                nome: true,
                sku: true,
              },
            },
          },
        },
      },
      orderBy: {
        dataHora: "desc",
      },
      take: 100, // Limitar a 100 vendas mais recentes
    });

    // Formatar dados para retorno
    const vendasFormatadas = vendas.map((venda: any) => ({
      id: venda.id,
      dataHora: venda.dataHora.toISOString(),
      valorTotal: Number(venda.valorTotal),
      metodoPagamento: venda.metodoPagamento,
      vendedor: venda.user.nome || venda.user.name || venda.user.email,
      itens: venda.saleItems.map((item: any) => ({
        id: item.id,
        produto: item.product.nome,
        sku: item.product.sku,
        quantidade: item.quantidade,
        precoUnitario: Number(item.precoUnitario),
        descontoAplicado: Number(item.descontoAplicado),
        subtotal: Number(item.subtotal),
      })),
    }));

    return NextResponse.json(vendasFormatadas);
  } catch (error) {
    console.error("Erro ao buscar vendas:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
