import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET: Listar avisos do usuário logado
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const userId = session.user.id;
    const empresaId = session.user.empresaId;

    const isRestricted =
      session.user.role === "caixa" || session.user.role === "gerente";

    // Buscar avisos onde o usuário é o destinatário OU (destinatário é null E é da mesma empresa)
    // Se for caixa, não ver avisos de broadcast do Master
    const avisos = await prisma.aviso.findMany({
      where: {
        AND: [
          {
            OR: [
              { destinatarioId: userId },
              {
                destinatarioId: null,
                empresaId: empresaId,
                ...(isRestricted
                  ? {
                      remetente: {
                        role: {
                          not: "master",
                        },
                      },
                    }
                  : {}),
              },
            ],
          },
          {
            remetenteId: {
              not: userId,
            },
          },
        ],
      },
      include: {
        remetente: {
          select: {
            nome: true,
            name: true,
            role: true,
          },
        },
      },
      orderBy: {
        criadoEm: "desc",
      },
    });

    return NextResponse.json(avisos);
  } catch (error) {
    console.error("Erro ao buscar avisos:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}

// POST: Criar novo aviso
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { mensagem, destinatarioId, importante, targetEmpresaId } =
      await request.json();

    if (!mensagem) {
      return NextResponse.json(
        { error: "Mensagem é obrigatória" },
        { status: 400 },
      );
    }

    let empresaId = session.user.empresaId;

    // Se for Master e especificou uma empresa alvo, usa ela
    if (session.user.role === "master" && targetEmpresaId) {
      empresaId = targetEmpresaId;
    }

    const novoAviso = await prisma.aviso.create({
      data: {
        mensagem,
        importante: importante || false,
        remetenteId: session.user.id,
        destinatarioId: destinatarioId || null,
        empresaId: empresaId,
      },
    });

    return NextResponse.json(novoAviso);
  } catch (error) {
    console.error("Erro ao criar aviso:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
