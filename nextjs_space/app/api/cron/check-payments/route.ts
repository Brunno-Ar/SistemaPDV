import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    // 1. Authorization Check
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // 2. Define cutoff date (Today - 3 days)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Calculate 3 days grace period
    // If due date was 05/12, we block on 09/12 (05 + 3 grace days = 08 is last active day?)
    // Requirement: "vencimentoPlano < (hoje - 3 dias)"
    // Example: Today is 10th. 10 - 3 = 7th. If vencimento is 6th or earlier, block.
    const cutoffDate = new Date(today);
    cutoffDate.setDate(today.getDate() - 3);

    // 3. Find active companies with overdue payments
    const overdueCompanies = await prisma.empresa.findMany({
      where: {
        status: "ATIVO",
        vencimentoPlano: {
          lt: cutoffDate,
        },
      },
      select: {
        id: true,
        nome: true,
        vencimentoPlano: true,
        users: {
          where: { role: "admin" },
          select: { email: true, nome: true },
          take: 1
        }
      }
    });

    // 4. Update status to PAUSADO
    const blockedCompaniesLog = [];

    for (const company of overdueCompanies) {
      await prisma.empresa.update({
        where: { id: company.id },
        data: { status: "PAUSADO" },
      });

      // TODO: Send notification email/whatsapp here
      // This is where you would integrate with your messaging service

      blockedCompaniesLog.push({
        id: company.id,
        nome: company.nome,
        vencimento: company.vencimentoPlano,
        bloqueadoEm: new Date(),
        adminEmail: company.users[0]?.email
      });
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
      { status: 500 }
    );
  }
}
