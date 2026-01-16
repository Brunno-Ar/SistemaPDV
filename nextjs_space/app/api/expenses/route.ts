import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET - Listar despesas da empresa com filtro de data
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    // Master pode ver de qualquer empresa (via query param)
    const isMaster = session.user.role === "master";
    const { searchParams } = new URL(request.url);

    let empresaId = session.user.empresaId;

    if (isMaster && searchParams.get("empresaId")) {
      empresaId = searchParams.get("empresaId");
    }

    if (!empresaId && !isMaster) {
      return NextResponse.json(
        { error: "Usuário não vinculado a uma empresa" },
        { status: 400 },
      );
    }

    // Filtros de data
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const category = searchParams.get("category");

    const whereClause: Record<string, unknown> = {};

    if (empresaId) {
      whereClause.empresaId = empresaId;
    }

    if (from || to) {
      whereClause.date = {};
      if (from) {
        (whereClause.date as Record<string, Date>).gte = new Date(from);
      }
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        (whereClause.date as Record<string, Date>).lte = toDate;
      }
    }

    if (category) {
      whereClause.category = category;
    }

    const expenses = await prisma.expense.findMany({
      where: whereClause,
      include: {
        user: {
          select: { name: true, email: true },
        },
        movimentacaoEstoque: {
          select: {
            id: true,
            tipo: true,
            quantidade: true,
            produto: {
              select: { nome: true },
            },
          },
        },
      },
      orderBy: { date: "desc" },
    });

    // Calcular totais
    const total = expenses.reduce((acc, exp) => acc + Number(exp.amount), 0);

    // Agrupar por categoria
    const byCategory: Record<string, number> = {};
    expenses.forEach((exp) => {
      const cat = exp.category || "OUTROS";
      byCategory[cat] = (byCategory[cat] || 0) + Number(exp.amount);
    });

    return NextResponse.json({
      expenses,
      summary: {
        total,
        count: expenses.length,
        byCategory,
      },
    });
  } catch (error) {
    console.error("Erro ao buscar despesas:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}

// POST - Criar nova despesa manual
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    // Apenas admin e master podem criar despesas manuais
    if (session.user.role !== "admin" && session.user.role !== "master") {
      return NextResponse.json(
        { error: "Apenas administradores podem registrar despesas manuais" },
        { status: 403 },
      );
    }

    const empresaId = session.user.empresaId;
    if (!empresaId && session.user.role !== "master") {
      return NextResponse.json(
        { error: "Usuário não vinculado a uma empresa" },
        { status: 400 },
      );
    }

    const body = await request.json();
    const { description, amount, category, date, empresaIdOverride } = body;

    // Validações
    if (!description || description.trim() === "") {
      return NextResponse.json(
        { error: "Descrição é obrigatória" },
        { status: 400 },
      );
    }

    const amountNum = Number(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return NextResponse.json(
        { error: "Valor deve ser maior que zero" },
        { status: 400 },
      );
    }

    // Master pode criar para outra empresa
    const targetEmpresaId =
      session.user.role === "master" && empresaIdOverride
        ? empresaIdOverride
        : empresaId;

    if (!targetEmpresaId) {
      return NextResponse.json(
        { error: "Empresa não especificada" },
        { status: 400 },
      );
    }

    const expense = await prisma.expense.create({
      data: {
        empresaId: targetEmpresaId,
        userId: session.user.id,
        description: description.trim(),
        amount: amountNum,
        category: category || "OUTROS",
        date: date ? new Date(date) : new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Despesa registrada com sucesso!",
      expense,
    });
  } catch (error) {
    console.error("Erro ao criar despesa:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}

// DELETE - Remover despesa
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    // Apenas admin e master podem deletar
    if (session.user.role !== "admin" && session.user.role !== "master") {
      return NextResponse.json(
        { error: "Sem permissão para deletar despesas" },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "ID da despesa é obrigatório" },
        { status: 400 },
      );
    }

    // Verificar se a despesa pertence à empresa do usuário
    const expense = await prisma.expense.findUnique({
      where: { id },
    });

    if (!expense) {
      return NextResponse.json(
        { error: "Despesa não encontrada" },
        { status: 404 },
      );
    }

    if (
      session.user.role !== "master" &&
      expense.empresaId !== session.user.empresaId
    ) {
      return NextResponse.json(
        { error: "Sem permissão para deletar esta despesa" },
        { status: 403 },
      );
    }

    await prisma.expense.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Despesa removida com sucesso!",
    });
  } catch (error) {
    console.error("Erro ao deletar despesa:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
