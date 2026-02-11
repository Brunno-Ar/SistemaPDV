import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

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

    // Buscar pagamentos no Asaas
    const ASAAS_API_URL =
      process.env.ASAAS_API_URL || "https://api.asaas.com/v3";
    const ASAAS_API_KEY = process.env.ASAAS_API_KEY;

    if (!ASAAS_API_KEY) {
      return NextResponse.json(
        { error: "ASAAS_API_KEY não configurada" },
        { status: 500 },
      );
    }

    const response = await fetch(
      `${ASAAS_API_URL}/payments?customer=${empresa.asaasCustomerId}&limit=50`,
      {
        headers: {
          access_token: ASAAS_API_KEY,
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      console.error("Erro Asaas:", await response.text());
      return NextResponse.json(
        { error: "Erro ao buscar pagamentos no Asaas" },
        { status: 500 },
      );
    }

    const data = await response.json();

    // Formatar dados para o frontend
    const pagamentos = data.data.map(
      (p: {
        id: string;
        value: number;
        status: string;
        dueDate: string;
        paymentDate: string | null;
        billingType: string;
        invoiceUrl: string | null;
        bankSlipUrl: string | null;
        pixTransaction?: { qrCodeUrl?: string } | null;
        description: string | null;
      }) => ({
        id: p.id,
        valor: p.value,
        status: p.status,
        vencimento: p.dueDate,
        dataPagamento: p.paymentDate,
        tipo: p.billingType,
        // URLs para visualizar/pagar
        invoiceUrl: p.invoiceUrl, // Fatura genérica
        boletoUrl: p.bankSlipUrl, // Link do boleto
        pixUrl: p.pixTransaction?.qrCodeUrl || null, // QR Code PIX
        descricao: p.description,
      }),
    );

    return NextResponse.json({
      empresa: empresa.nome,
      total: data.totalCount,
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
