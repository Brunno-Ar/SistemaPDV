
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

export const dynamic = "force-dynamic"

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Acesso negado. Apenas administradores podem acessar.' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Filtro de data se fornecido
    let dateFilter = {}
    if (startDate && endDate) {
      dateFilter = {
        dataHora: {
          gte: new Date(startDate + 'T00:00:00'),
          lte: new Date(endDate + 'T23:59:59')
        }
      }
    }

    const sales = await prisma.sale.findMany({
      where: dateFilter,
      include: {
        user: {
          select: {
            nome: true,
            name: true
          }
        }
      },
      orderBy: {
        dataHora: 'desc'
      },
      take: 50 // Limitar a 50 vendas mais recentes
    })

    // Converter Decimal para number e formatar dados
    const salesFormatted = sales.map(sale => ({
      id: sale.id,
      dataHora: sale.dataHora.toISOString(),
      valorTotal: Number(sale.valorTotal),
      metodoPagamento: sale.metodoPagamento,
      user: {
        nome: sale.user?.nome || sale.user?.name || 'N/A'
      }
    }))

    return NextResponse.json(salesFormatted)

  } catch (error) {
    console.error('Erro ao buscar vendas:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
