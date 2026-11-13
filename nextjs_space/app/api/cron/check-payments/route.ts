import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { autorizarCron } from "@/lib/cron-auth";
import {
  TOLERANCIA_PAGAMENTO_DIAS,
  TOLERANCIA_TRIAL_DIAS,
} from "@/lib/access";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    // 1. Authorization Check (falha fechada se CRON_SECRET nao estiver setado)
    if (!autorizarCron(request.headers.get("authorization"), process.env.CRON_SECRET)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Cutoffs (regra única em lib/access)
    // Limite do dia em UTC (consistente entre servidores/regiões). Contas sem
    // vencimento (free) não entram: NULL não casa com `lt` no filtro.
    const agora = new Date();
    const inicioDiaUtc = Date.UTC(
      agora.getUTCFullYear(),
      agora.getUTCMonth(),
      agora.getUTCDate(),
    );
    const DIA_MS = 24 * 60 * 60 * 1000;

    // Plano vencido: pausa após TOLERANCIA_PAGAMENTO_DIAS (10 dias).
    const pagamentoCutoff = new Date(
      inicioDiaUtc - TOLERANCIA_PAGAMENTO_DIAS * DIA_MS,
    );

    // Trial vencido: pausa após TOLERANCIA_TRIAL_DIAS (1 dia).
    const trialCutoff = new Date(
      inicioDiaUtc - TOLERANCIA_TRIAL_DIAS * DIA_MS,
    );

    // 3. Empresas ATIVAS com mensalidade vencida além da tolerância
    const overdueCompanies = await prisma.empresa.findMany({
      where: { status: "ATIVO", vencimentoPlano: { lt: pagamentoCutoff } },
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
      where: { status: "EM_TESTE", vencimentoPlano: { lt: trialCutoff } },
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
