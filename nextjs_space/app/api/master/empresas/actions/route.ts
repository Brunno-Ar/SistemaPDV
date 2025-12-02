import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Verificar se é master
    if (!session?.user || session.user.role !== "master") {
      return NextResponse.json(
        { error: "Acesso negado. Apenas masters podem executar esta ação." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      action,
      empresaId,
      userId,
      mensagem,
      importante,
      novoVencimento,
      novoDiaVencimento,
    } = body;

    // Validações
    if (!action) {
      return NextResponse.json(
        { error: "Ação não especificada." },
        { status: 400 }
      );
    }

    switch (action) {
      case "aprovar":
        // Aprovar empresa (status = ATIVO, vencimento +30 dias)
        if (!empresaId) {
          return NextResponse.json(
            { error: "empresaId obrigatório" },
            { status: 400 }
          );
        }

        const vencimento = new Date();
        vencimento.setDate(vencimento.getDate() + 30);

        const empresaAprovada = await prisma.empresa.update({
          where: { id: empresaId },
          data: {
            status: "ATIVO",
            vencimentoPlano: vencimento,
          },
        });

        return NextResponse.json({
          success: true,
          message: "Empresa aprovada com sucesso!",
          empresa: empresaAprovada,
        });

      case "renovar":
        // Renovar plano (+30 dias no vencimento)
        if (!empresaId) {
          return NextResponse.json(
            { error: "empresaId obrigatório" },
            { status: 400 }
          );
        }

        const empresa = await prisma.empresa.findUnique({
          where: { id: empresaId },
        });

        if (!empresa) {
          return NextResponse.json(
            { error: "Empresa não encontrada" },
            { status: 404 }
          );
        }

        // Nova data de vencimento = data atual do vencimento + 30 dias
        const novoVencimentoCalculado = empresa.vencimentoPlano
          ? new Date(
              empresa.vencimentoPlano.getTime() + 30 * 24 * 60 * 60 * 1000
            )
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

        const empresaRenovada = await prisma.empresa.update({
          where: { id: empresaId },
          data: {
            vencimentoPlano: novoVencimentoCalculado,
            status: "ATIVO", // Reativar se estiver pausado
          },
        });

        return NextResponse.json({
          success: true,
          message: "Plano renovado com sucesso! (+30 dias)",
          empresa: empresaRenovada,
        });

      case "updateVencimento":
        // Atualizar data de vencimento específica e dia de vencimento
        if (!empresaId || !novoVencimento) {
          return NextResponse.json(
            { error: "empresaId e novoVencimento obrigatórios" },
            { status: 400 }
          );
        }

        const dataUpdate: any = {
          vencimentoPlano: new Date(novoVencimento),
          status: "ATIVO", // Reativa caso esteja pausado
        };

        if (novoDiaVencimento) {
          dataUpdate.diaVencimento = Number(novoDiaVencimento);
        }

        const empresaAtualizadaData = await prisma.empresa.update({
          where: { id: empresaId },
          data: dataUpdate,
        });

        return NextResponse.json({
          success: true,
          message: "Plano atualizado com sucesso!",
          empresa: empresaAtualizadaData,
        });

      case "pausar":
        // Pausar empresa
        if (!empresaId) {
          return NextResponse.json(
            { error: "empresaId obrigatório" },
            { status: 400 }
          );
        }

        const empresaPausada = await prisma.empresa.update({
          where: { id: empresaId },
          data: { status: "PAUSADO" },
        });

        return NextResponse.json({
          success: true,
          message: "Empresa pausada com sucesso!",
          empresa: empresaPausada,
        });

      case "reativar":
        // Reativar empresa pausada
        if (!empresaId) {
          return NextResponse.json(
            { error: "empresaId obrigatório" },
            { status: 400 }
          );
        }

        const empresaReativada = await prisma.empresa.update({
          where: { id: empresaId },
          data: { status: "ATIVO" },
        });

        return NextResponse.json({
          success: true,
          message: "Empresa reativada com sucesso!",
          empresa: empresaReativada,
        });

      case "spy":
        // Spy Mode - Buscar faturamento total da empresa
        if (!empresaId) {
          return NextResponse.json(
            { error: "empresaId obrigatório" },
            { status: 400 }
          );
        }

        const faturamentoData = await prisma.sale.aggregate({
          where: { empresaId },
          _sum: { valorTotal: true },
          _count: true,
        });

        const totalProdutos = await prisma.product.count({
          where: { empresaId },
        });

        const totalUsuarios = await prisma.user.count({
          where: { empresaId },
        });

        return NextResponse.json({
          success: true,
          data: {
            faturamentoTotal: Number(faturamentoData._sum.valorTotal || 0),
            totalVendas: faturamentoData._count,
            totalProdutos,
            totalUsuarios,
          },
        });

      case "resetSenha":
        // Reset de senha do admin da empresa para "Mudar123"
        if (!empresaId) {
          return NextResponse.json(
            { error: "empresaId obrigatório" },
            { status: 400 }
          );
        }

        // Buscar o usuário admin dessa empresa
        const adminUser = await prisma.user.findFirst({
          where: {
            empresaId: empresaId,
            role: "admin",
          },
        });

        if (!adminUser) {
          return NextResponse.json(
            { error: "Admin não encontrado para esta empresa" },
            { status: 404 }
          );
        }

        const novaSenhaHash = await bcrypt.hash("Mudar123", 10);

        const userAtualizado = await prisma.user.update({
          where: { id: adminUser.id },
          data: { password: novaSenhaHash },
        });

        return NextResponse.json({
          success: true,
          message: `Senha do usuário ${userAtualizado.email} resetada para: Mudar123`,
        });

      case "criarAviso":
        // Criar aviso para uma empresa
        if (!empresaId || !mensagem) {
          return NextResponse.json(
            { error: "empresaId e mensagem são obrigatórios" },
            { status: 400 }
          );
        }

        const aviso = await prisma.aviso.create({
          data: {
            mensagem,
            importante: importante || false,
            empresaId,
            remetenteId: session.user.id,
          },
        });

        return NextResponse.json({
          success: true,
          message: "Aviso criado com sucesso!",
          aviso,
        });

      case "limparDadosTeste":
        // ⚠️ PERIGO: Limpar dados de teste (Vendas, Estoque, Caixas)
        if (!empresaId) {
          return NextResponse.json(
            { error: "empresaId obrigatório" },
            { status: 400 }
          );
        }

        await prisma.$transaction(async (tx) => {
          // 1. Apagar Itens de Venda (Cascade delete normalmente cuida disso, mas vamos garantir)
          // Precisamos buscar as vendas da empresa primeiro para apagar os itens
          const vendas = await tx.sale.findMany({
            where: { empresaId },
            select: { id: true },
          });
          const vendaIds = vendas.map((v) => v.id);

          if (vendaIds.length > 0) {
            await tx.saleItem.deleteMany({
              where: { saleId: { in: vendaIds } },
            });
          }

          // 2. Apagar Vendas
          await tx.sale.deleteMany({
            where: { empresaId },
          });

          // 3. Apagar Movimentações de Estoque (APENAS VENDAS)
          await tx.movimentacaoEstoque.deleteMany({
            where: {
              empresaId,
              tipo: "VENDA",
            },
          });

          // 4. Apagar Caixas
          await tx.caixa.deleteMany({
            where: { empresaId },
          });

          // 5. NÃO apagar Avisos, Produtos (estoque) ou Lotes.
          // O objetivo é limpar apenas o histórico financeiro de vendas.
        });

        return NextResponse.json({
          success: true,
          message: "Dados de teste limpos com sucesso! Estoque zerado.",
        });

      default:
        return NextResponse.json({ error: "Ação inválida." }, { status: 400 });
    }
  } catch (error) {
    console.error("Erro na ação master:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
