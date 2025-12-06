import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get("asaas-access-token");
    const secret = process.env.ASAAS_WEBHOOK_SECRET;

    if (!token || token !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { event, payment } = body;

    console.log("Asaas Webhook Event:", event, payment.id);

    if (!payment || !payment.customer) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    // Buscar empresa pelo customer ID
    const empresa = await prisma.empresa.findUnique({
      where: { asaasCustomerId: payment.customer },
    });

    if (!empresa) {
      console.warn(`Empresa não encontrada para customer ${payment.customer}`);
      return NextResponse.json({ message: "Customer ignored" });
    }

    if (event === "PAYMENT_RECEIVED" || event === "PAYMENT_CONFIRMED") {
      // Pagamento confirmado: Renovar plano

      const hoje = new Date();
      let novoVencimento = new Date(empresa.vencimentoPlano || hoje);

      // Proteção: Se o vencimento for null, usa hoje.
      if (!empresa.vencimentoPlano) {
          novoVencimento = new Date();
      }

      // Adicionar 1 mês de forma segura (lidando com fim de mês)
      const currentDay = novoVencimento.getDate();
      novoVencimento.setMonth(novoVencimento.getMonth() + 1);

      // Se o dia mudou (ex: era 31/01 e virou 02/03 ou 03/03), volta para o último dia do mês anterior
      if (novoVencimento.getDate() !== currentDay) {
          novoVencimento.setDate(0);
      }

      await prisma.empresa.update({
        where: { id: empresa.id },
        data: {
          status: "ATIVO", // Remove EM_TESTE ou PAUSADO
          vencimentoPlano: novoVencimento,
        },
      });

      console.log(`Empresa ${empresa.nome} renovada para ${novoVencimento.toISOString()}`);

    } else if (event === "PAYMENT_OVERDUE") {
      // Atrasou: Pausar (respeitando tolerância do sistema ou pausando direto?)
      // User disse: "Update status para PAUSADO"

      await prisma.empresa.update({
        where: { id: empresa.id },
        data: {
          status: "PAUSADO",
        },
      });
      console.log(`Empresa ${empresa.nome} pausada por inadimplência`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
