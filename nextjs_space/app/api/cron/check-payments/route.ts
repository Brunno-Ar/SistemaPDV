import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { autorizarCron } from "@/lib/cron-auth";
import {
  TRIAL_DIAS_PADRAO,
  TOLERANCIA_PAGAMENTO_DIAS,
  TOLERANCIA_TRIAL_DIAS,
} from "@/lib/access";
import { calcularInicioDiaCivilSaoPaulo } from "@/lib/billing-policy";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    // 1. Authorization Check (falha fechada se CRON_SECRET nao estiver setado)
    if (!autorizarCron(request.headers.get("authorization"), process.env.CRON_SECRET)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Cutoffs alinhados ao fuso America/Sao_Paulo (regra única em lib/billing-policy)
    // Contas sem vencimento (free) não entram: NULL não casa com `lt` no filtro.
    const agora = new Date();
    const inicioDiaSaoPaulo = calcularInicioDiaCivilSaoPaulo(agora);
    const DIA_MS = 24 * 60 * 60 * 1000;

    // Plano vencido: pausa após vencimento sem tolerância (0 dias).
    const pagamentoCutoff = new Date(
      inicioDiaSaoPaulo.getTime() - TOLERANCIA_PAGAMENTO_DIAS * DIA_MS,
    );

    // Trial vencido: pausa após vencimento do trial sem tolerância (0 dias).
    const trialCutoff = new Date(
      inicioDiaSaoPaulo.getTime() - TOLERANCIA_TRIAL_DIAS * DIA_MS,
    );

    // Cutoff de vencimento derivado de createdAt (trial + graça/tolerância) para
    // contas sem vencimentoPlano (legadas NULL): não prescreve acesso infinito.
    const overdueFromCriacaoCutoff = new Date(
      inicioDiaSaoPaulo.getTime() -
        (TRIAL_DIAS_PADRAO + TOLERANCIA_PAGAMENTO_DIAS) * DIA_MS,
    );
    const expiredTrialFromCriacaoCutoff = new Date(
      inicioDiaSaoPaulo.getTime() -
        (TRIAL_DIAS_PADRAO + TOLERANCIA_TRIAL_DIAS) * DIA_MS,
    );

    // 3. Empresas ATIVAS com mensalidade vencida além da tolerância
    const overdueCompanies = await prisma.empresa.findMany({
      where: {
        status: "ATIVO",
        OR: [
          { vencimentoPlano: { lt: pagamentoCutoff } },
          {
            vencimentoPlano: null,
            createdAt: { lt: overdueFromCriacaoCutoff },
          },
        ],
      },
      select: {
        id: true,
        nome: true,
        vencimentoPlano: true,
        users: {
          where: { role: "admin" },
          select: { email: true, nome: true },
          take: 1,
        },
      },
    });

    // 4. Trials EM_TESTE expirados além da tolerância
    const expiredTrials = await prisma.empresa.findMany({
      where: {
        status: "EM_TESTE",
        OR: [
          { vencimentoPlano: { lt: trialCutoff } },
          {
            vencimentoPlano: null,
            createdAt: { lt: expiredTrialFromCriacaoCutoff },
          },
        ],
      },
      select: {
        id: true,
        nome: true,
        vencimentoPlano: true,
        users: {
          where: { role: "admin" },
          select: { email: true, nome: true },
          take: 1,
        },
      },
    });

    // 5. Atualizar status para PAUSADO
    const blockedCompaniesLog: Array<{
      id: string;
      nome: string;
      vencimento: Date | null;
      motivo: "plano-vencido" | "trial-expirado";
      bloqueadoEm: Date;
      adminEmail?: string;
    }> = [];

    const registrarBloqueio = async (
      empresaId: string,
      nome: string,
      vencimento: Date | null,
      motivo: "plano-vencido" | "trial-expirado",
      adminEmail?: string,
    ) => {
      await prisma.empresa.update({
        where: { id: empresaId },
        data: { status: "PAUSADO" },
      });

      // TODO: Send notification email/whatsapp here
      // This is where you would integrate with your messaging service

      blockedCompaniesLog.push({
        id: empresaId,
        nome,
        vencimento,
        motivo,
        bloqueadoEm: new Date(),
        adminEmail,
      });
    };

    for (const company of overdueCompanies) {
      await registrarBloqueio(
        company.id,
        company.nome,
        company.vencimentoPlano,
        "plano-vencido",
        company.users[0]?.email,
      );
    }

    for (const trial of expiredTrials) {
      await registrarBloqueio(
        trial.id,
        trial.nome,
        trial.vencimentoPlano,
        "trial-expirado",
        trial.users[0]?.email,
      );
    }

    return NextResponse.json({
      success: true,
      blockedCount: blockedCompaniesLog.length,
      details: blockedCompaniesLog,
    });
  } catch (error) {
    console.error("Cron Job Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
