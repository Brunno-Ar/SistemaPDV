import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const empresaId = session.user.empresaId;

    if (!empresaId) {
      return NextResponse.json(
        { error: "User not linked to a company" },
        { status: 400 },
      );
    }

    const sale = await prisma.sale.findFirst({
      where: {
        userId,
        empresaId,
      },
      select: {
        id: true,
      },
    });

    return NextResponse.json({
      hasSale: Boolean(sale),
    });
  } catch (error) {
    console.error("Erro ao verificar status de onboarding do funcionario:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
