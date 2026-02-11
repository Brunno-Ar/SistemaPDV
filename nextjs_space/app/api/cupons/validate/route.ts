import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { codigo } = await req.json();

    if (!codigo) {
      return NextResponse.json(
        { error: "Código obrigatório" },
        { status: 400 },
      );
    }

    const cupom = await prisma.cupom.findUnique({
      where: { codigo: codigo.toUpperCase() },
    });

    if (!cupom) {
      return NextResponse.json(
        { error: "Cupom inválido ou não encontrado" },
        { status: 404 },
      );
    }

    const now = new Date();

    // Validar Expiração
    if (cupom.validoAte && cupom.validoAte < now) {
      return NextResponse.json(
        { error: "Este cupom expirou" },
        { status: 400 },
      );
    }

    // Validar Limite de Usos
    if (cupom.limiteUsos !== null && cupom.usosAtuais >= cupom.limiteUsos) {
      return NextResponse.json(
        { error: "Limite de usos deste cupom foi atingido" },
        { status: 400 },
      );
    }

    return NextResponse.json({
      valid: true,
      descontoPorcentagem: cupom.descontoPorcentagem,
      mensagem: `Cupom de ${cupom.descontoPorcentagem}% aplicado!`,
    });
  } catch (error) {
    console.error("Erro ao validar cupom:", error);
    return NextResponse.json(
      { error: "Erro interno ao validar cupom" },
      { status: 500 },
    );
  }
}
