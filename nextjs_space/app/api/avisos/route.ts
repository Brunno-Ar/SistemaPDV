
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

export const dynamic = "force-dynamic"

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || !session.user.empresaId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const avisos = await prisma.aviso.findMany({
      where: {
        empresaId: session.user.empresaId
      },
      orderBy: {
        criadoEm: 'desc'
      },
      take: 5 // Últimos 5 avisos
    })

    return NextResponse.json(avisos)
  } catch (error) {
    console.error('Erro ao buscar avisos:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
