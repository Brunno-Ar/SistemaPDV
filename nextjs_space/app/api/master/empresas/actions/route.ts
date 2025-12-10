import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { asaas } from "@/lib/asaas";
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

        const empresaParaAprovar = await prisma.empresa.findUnique({
          where: { id: empresaId },
        });

        const vencimento = new Date();
        vencimento.setDate(vencimento.getDate() + 30);

        // Se tem assinatura no Asaas, reativar
        if (empresaParaAprovar?.asaasSubscriptionId) {
          try {
            await asaas.reactivateSubscription(
              empresaParaAprovar.asaasSubscriptionId
            );
            await asaas.updateSubscriptionDueDate(
              empresaParaAprovar.asaasSubscriptionId,
              vencimento
            );
          } catch (asaasError) {
            console.error("Erro ao reativar no Asaas:", asaasError);
            // Continua mesmo se falhar no Asaas
          }
        }

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

        // Atualizar no Asaas
        if (empresa.asaasSubscriptionId) {
          try {
            await asaas.updateSubscriptionDueDate(
              empresa.asaasSubscriptionId,
              novoVencimentoCalculado
            );
            await asaas.reactivateSubscription(empresa.asaasSubscriptionId);
          } catch (asaasError) {
            console.error("Erro ao renovar no Asaas:", asaasError);
          }
        }

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

        const empresaParaAtualizar = await prisma.empresa.findUnique({
          where: { id: empresaId },
        });

        const novaDataVencimento = new Date(novoVencimento);

        // Atualizar no Asaas
        if (empresaParaAtualizar?.asaasSubscriptionId) {
          try {
            await asaas.updateSubscriptionDueDate(
              empresaParaAtualizar.asaasSubscriptionId,
              novaDataVencimento
            );
            // Se estava pausado, reativar no Asaas
            if (empresaParaAtualizar.status === "PAUSADO") {
              await asaas.reactivateSubscription(
                empresaParaAtualizar.asaasSubscriptionId
              );
            }
          } catch (asaasError) {
            console.error("Erro ao atualizar vencimento no Asaas:", asaasError);
          }
        }

        const dataUpdate: any = {
          vencimentoPlano: novaDataVencimento,
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
        // Pausar empresa (salva status anterior para restaurar depois)
        if (!empresaId) {
          return NextResponse.json(
            { error: "empresaId obrigatório" },
            { status: 400 }
          );
        }

        const empresaParaPausar = await prisma.empresa.findUnique({
          where: { id: empresaId },
        });

        if (!empresaParaPausar) {
          return NextResponse.json(
            { error: "Empresa não encontrada" },
            { status: 404 }
          );
        }

        // Salvar o status anterior no campo ultimoDesbloqueio (usando como marcador)
        // Se era EM_TESTE, guardar essa info
        const statusAnterior = empresaParaPausar.status;

        // Pausar no Asaas também
        if (empresaParaPausar?.asaasSubscriptionId) {
          try {
            await asaas.pauseSubscription(
              empresaParaPausar.asaasSubscriptionId
            );
          } catch (asaasError) {
            console.error("Erro ao pausar no Asaas:", asaasError);
            // Continua mesmo se falhar no Asaas
          }
        }

        // Guardar status anterior no campo liberacaoTemporariaAte como marcador
        // Usamos uma data especial para indicar que era EM_TESTE
        const empresaPausada = await prisma.empresa.update({
          where: { id: empresaId },
          data: {
            status: "PAUSADO",
            // Salvar marcador: se era EM_TESTE, guardar data específica (1970-01-02)
            // Se era ATIVO, guardar outra (1970-01-01)
            liberacaoTemporariaAte:
              statusAnterior === "EM_TESTE"
                ? new Date("1970-01-02T00:00:00Z")
                : new Date("1970-01-01T00:00:00Z"),
          },
        });

        return NextResponse.json({
          success: true,
          message: `Empresa pausada com sucesso! (Status anterior: ${statusAnterior})`,
          empresa: empresaPausada,
        });

      case "reativar":
        // Reativar empresa pausada (restaura status anterior)
        if (!empresaId) {
          return NextResponse.json(
            { error: "empresaId obrigatório" },
            { status: 400 }
          );
        }

        const empresaParaReativar = await prisma.empresa.findUnique({
          where: { id: empresaId },
        });

        if (!empresaParaReativar) {
          return NextResponse.json(
            { error: "Empresa não encontrada" },
            { status: 404 }
          );
        }

        // Reativar no Asaas também
        if (empresaParaReativar?.asaasSubscriptionId) {
          try {
            await asaas.reactivateSubscription(
              empresaParaReativar.asaasSubscriptionId
            );
          } catch (asaasError) {
            console.error("Erro ao reativar no Asaas:", asaasError);
            // Continua mesmo se falhar no Asaas
          }
        }

        // Restaurar status anterior baseado no marcador liberacaoTemporariaAte
        // 1970-01-02 = era EM_TESTE, 1970-01-01 ou null = era ATIVO
        let statusRestaurado = "ATIVO";
        if (
          empresaParaReativar.liberacaoTemporariaAte &&
          empresaParaReativar.liberacaoTemporariaAte.getTime() ===
            new Date("1970-01-02T00:00:00Z").getTime()
        ) {
          statusRestaurado = "EM_TESTE";
        }

        const empresaReativada = await prisma.empresa.update({
          where: { id: empresaId },
          data: {
            status: statusRestaurado,
            liberacaoTemporariaAte: null, // Limpar marcador
          },
        });

        return NextResponse.json({
          success: true,
          message: `Empresa reativada com sucesso! (Status: ${statusRestaurado})`,
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

      case "syncAsaas":
        // Sincronizar dados do Asaas para o sistema local
        if (!empresaId) {
          return NextResponse.json(
            { error: "empresaId obrigatório" },
            { status: 400 }
          );
        }

        const empresaParaSync = await prisma.empresa.findUnique({
          where: { id: empresaId },
        });

        if (!empresaParaSync?.asaasSubscriptionId) {
          return NextResponse.json(
            { error: "Empresa não tem assinatura no Asaas" },
            { status: 400 }
          );
        }

        try {
          const subscription = await asaas.getSubscription(
            empresaParaSync.asaasSubscriptionId
          );

          // Mapear status do Asaas para status do sistema
          // IMPORTANTE: Preservar EM_TESTE se a conta ainda está em período de trial
          let novoStatus = empresaParaSync.status;

          // Se está EM_TESTE, NÃO alterar baseado no Asaas (trial não tem pagamento)
          if (empresaParaSync.status === "EM_TESTE") {
            // Manter EM_TESTE - a sincronização não deve alterar contas em trial
            novoStatus = "EM_TESTE";
          } else if (subscription.status === "ACTIVE") {
            novoStatus = "ATIVO";
          } else if (subscription.status === "INACTIVE") {
            novoStatus = "PAUSADO";
          }

          // Atualizar vencimento e status
          const empresaSincronizada = await prisma.empresa.update({
            where: { id: empresaId },
            data: {
              vencimentoPlano: subscription.nextDueDate
                ? new Date(subscription.nextDueDate)
                : empresaParaSync.vencimentoPlano,
              status: novoStatus,
            },
          });

          return NextResponse.json({
            success: true,
            message: `Sincronizado! Vencimento: ${subscription.nextDueDate}, Status Asaas: ${subscription.status}`,
            empresa: empresaSincronizada,
          });
        } catch (syncError) {
          console.error("Erro ao sincronizar com Asaas:", syncError);
          return NextResponse.json(
            { error: "Erro ao buscar dados do Asaas" },
            { status: 500 }
          );
        }

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
