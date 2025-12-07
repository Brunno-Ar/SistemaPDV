import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.empresaId) {
      return NextResponse.json({ status: null });
    }

    const empresa: any = await prisma.empresa.findUnique({
      where: { id: session.user.empresaId },
      select: {
        status: true,
        vencimentoPlano: true,
        plano: true,
        liberacaoTemporariaAte: true,
      },
    } as any);

    if (!empresa) {
      return NextResponse.json({ status: null });
    }

    return NextResponse.json({
      status: empresa.status,
      vencimentoPlano: empresa.vencimentoPlano,
      plano: empresa.plano,
      liberacaoTemporariaAte: empresa.liberacaoTemporariaAte,
    });
  } catch (error) {
    console.error("Erro ao buscar status da empresa:", error);
    return NextResponse.json({ status: null }, { status: 500 });
  }
}
