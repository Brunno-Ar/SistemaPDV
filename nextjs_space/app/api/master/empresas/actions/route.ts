import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

const prisma = new PrismaClient();

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
    const { action, empresaId, userId, mensagem, importante } = body;

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
        const novoVencimento = empresa.vencimentoPlano
          ? new Date(
              empresa.vencimentoPlano.getTime() + 30 * 24 * 60 * 60 * 1000
            )
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

        const empresaRenovada = await prisma.empresa.update({
          where: { id: empresaId },
          data: {
            vencimentoPlano: novoVencimento,
            status: "ATIVO", // Reativar se estiver pausado
          },
        });

        return NextResponse.json({
          success: true,
          message: "Plano renovado com sucesso! (+30 dias)",
          empresa: empresaRenovada,
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
        // Reset de senha de qualquer usuário para "Mudar123"
        if (!userId) {
          return NextResponse.json(
            { error: "userId obrigatório" },
            { status: 400 }
          );
        }

        const novaSenhaHash = await bcrypt.hash("Mudar123", 10);

        const userAtualizado = await prisma.user.update({
          where: { id: userId },
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

          // 3. Apagar Movimentações de Estoque
          await tx.movimentacaoEstoque.deleteMany({
            where: { empresaId },
          });

          // 4. Apagar Caixas
          await tx.caixa.deleteMany({
            where: { empresaId },
          });

          // 5. Apagar Avisos
          await tx.aviso.deleteMany({
            where: { empresaId },
          });

          // 6. Zerar Estoque dos Produtos (Reset)
          await tx.product.updateMany({
            where: { empresaId },
            data: { estoqueAtual: 0 },
          });

          // 7. Zerar Lotes (Opcional, mas recomendado para consistência)
          // Como Product.estoqueAtual é cache, precisamos zerar ou apagar os lotes.
          // Vamos apagar os lotes para começar do zero.
          const produtos = await tx.product.findMany({
            where: { empresaId },
            select: { id: true },
          });
          const produtoIds = produtos.map((p) => p.id);

          if (produtoIds.length > 0) {
            await tx.lote.deleteMany({
              where: { produtoId: { in: produtoIds } },
            });
          }
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
