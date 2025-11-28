import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "master") {
      return NextResponse.json(
        { error: "Acesso negado. Apenas Master." },
        { status: 403 }
      );
    }

    // Métricas Globais
    const totalEmpresas = await prisma.empresa.count();
    const empresasAtivas = await prisma.empresa.count({
      where: { status: "ATIVO" },
    });
    const empresasPendentes = await prisma.empresa.count({
      where: { status: "PENDENTE" },
    });

    const totalUsuarios = await prisma.user.count({
      where: { role: { not: "master" } }, // Excluir masters da contagem
    });

    // Volume Transacionado Total
    const todasVendas = await prisma.sale.findMany({
      select: { valorTotal: true },
    });
    const volumeTransacionado = todasVendas.reduce(
      (acc, sale) => acc + Number(sale.valorTotal),
      0
    );

    // Vendas Hoje
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const vendasHoje = await prisma.sale.count({
      where: {
        dataHora: {
          gte: hoje,
        },
      },
    });

    return NextResponse.json({
      totalEmpresas,
      empresasAtivas,
      empresasPendentes,
      totalUsuarios,
      volumeTransacionado,
      vendasHoje,
    });
  } catch (error) {
    console.error("Erro ao buscar analytics master:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
