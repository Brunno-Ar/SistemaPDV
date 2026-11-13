import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { asaas } from "@/lib/asaas";

export const dynamic = "force-dynamic";

// GET - Buscar boletos/pagamentos de uma empresa
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "master") {
      return NextResponse.json(
        { error: "Acesso negado. Apenas usuários master." },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(request.url);
    const empresaId = searchParams.get("empresaId");

    if (!empresaId) {
      return NextResponse.json(
        { error: "empresaId é obrigatório" },
        { status: 400 },
      );
    }

    // Buscar empresa e seu asaasCustomerId
    const empresa = await prisma.empresa.findUnique({
      where: { id: empresaId },
      select: { asaasCustomerId: true, nome: true },
    });

    if (!empresa) {
      return NextResponse.json(
        { error: "Empresa não encontrada" },
        { status: 404 },
      );
    }

    if (!empresa.asaasCustomerId) {
      return NextResponse.json(
        { error: "Esta empresa não possui conta no Asaas (conta gratuita)" },
        { status: 400 },
      );
    }

    // Buscar pagamentos no Asaas via cliente compartilhado (guard de live
    // fora de producao aplicado internamente em asaasRequest).
    const resultado = await asaas.listPaymentsByCustomer(empresa.asaasCustomerId);

    if (!resultado) {
      return NextResponse.json(
        { error: "Erro ao buscar pagamentos no Asaas" },
        { status: 500 },
      );
    }

    // Formatar dados para o frontend
    const pagamentos = resultado.data.map((p) => ({
      id: p.id,
      valor: p.value,
      status: p.status,
      vencimento: p.dueDate,
      dataPagamento: (p as any).paymentDate ?? null,
      tipo: (p as any).billingType ?? null,
      // URLs para visualizar/pagar
      invoiceUrl: p.invoiceUrl ?? null, // Fatura genérica
      boletoUrl: (p as any).bankSlipUrl ?? null, // Link do boleto
      pixUrl: (p as any).pixTransaction?.qrCodeUrl ?? null, // QR Code PIX
      descricao: (p as any).description ?? null,
    }));

    return NextResponse.json({
      empresa: empresa.nome,
      total: resultado.totalCount,
      pagamentos,
    });
  } catch (error) {
    console.error("Erro ao buscar pagamentos:", error);
    return NextResponse.json(
      { error: "Erro interno ao buscar pagamentos" },
      { status: 500 },
    );
  }
}
