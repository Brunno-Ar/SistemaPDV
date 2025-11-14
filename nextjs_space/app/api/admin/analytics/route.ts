
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

    // Definir períodos
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekStart = new Date(today.getTime() - (today.getDay() * 24 * 60 * 60 * 1000))
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    // Se há filtro de data personalizado
    let dateFilter: any = {}
    if (startDate && endDate) {
      dateFilter = {
        dataHora: {
          gte: new Date(startDate + 'T00:00:00'),
          lte: new Date(endDate + 'T23:59:59')
        }
      }
    }

    // Vendas hoje
    const vendasHoje = await prisma.sale.aggregate({
      where: {
        dataHora: {
          gte: today
        }
      },
      _sum: {
        valorTotal: true
      },
      _count: true
    })

    // Vendas semana
    const vendasSemana = await prisma.sale.aggregate({
      where: {
        dataHora: {
          gte: weekStart
        }
      },
      _sum: {
        valorTotal: true
      },
      _count: true
    })

    // Vendas mês
    const vendasMes = await prisma.sale.aggregate({
      where: {
        dataHora: {
          gte: monthStart
        }
      },
      _sum: {
        valorTotal: true
      },
      _count: true
    })

    // Produtos mais vendidos (usar filtro de data se fornecido)
    const produtosMaisVendidos = await prisma.saleItem.groupBy({
      by: ['productId'],
      where: dateFilter.dataHora ? {
        sale: {
          dataHora: dateFilter.dataHora
        }
      } : undefined,
      _sum: {
        quantidade: true,
        subtotal: true
      },
      orderBy: {
        _sum: {
          quantidade: 'desc'
        }
      },
      take: 10
    })

    // Buscar nomes dos produtos
    const productIds = produtosMaisVendidos.map(item => item.productId)
    const products = await prisma.product.findMany({
      where: {
        id: {
          in: productIds
        }
      },
      select: {
        id: true,
        nome: true
      }
    })

    const produtosMaisVendidosFormatted = produtosMaisVendidos.map(item => {
      const product = products.find(p => p.id === item.productId)
      return {
        nome: product?.nome || 'Produto não encontrado',
        totalVendido: item._sum.quantidade || 0,
        valorTotal: Number(item._sum.subtotal || 0)
      }
    })

    // Vendas por método de pagamento (usar filtro de data se fornecido)
    const vendasPorMetodo = await prisma.sale.groupBy({
      by: ['metodoPagamento'],
      where: dateFilter,
      _sum: {
        valorTotal: true
      },
      _count: true
    })

    const vendasPorMetodoFormatted = vendasPorMetodo.map(item => ({
      metodo: item.metodoPagamento,
      total: item._count,
      valor: Number(item._sum.valorTotal || 0)
    }))

    return NextResponse.json({
      totalVendasHoje: Number(vendasHoje._sum.valorTotal || 0),
      totalVendasSemana: Number(vendasSemana._sum.valorTotal || 0),
      totalVendasMes: Number(vendasMes._sum.valorTotal || 0),
      transacoesHoje: vendasHoje._count,
      transacoesSemana: vendasSemana._count,
      transacoesMes: vendasMes._count,
      produtosMaisVendidos: produtosMaisVendidosFormatted,
      vendasPorMetodo: vendasPorMetodoFormatted
    })

  } catch (error) {
    console.error('Erro ao buscar analytics:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
