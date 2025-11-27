
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic"

// GET - Buscar caixa aberto do usuário
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const caixaAberto = await prisma.caixa.findFirst({
      where: {
        usuarioId: session.user.id,
        status: 'ABERTO'
      },
      orderBy: {
        dataAbertura: 'desc'
      }
    })

    return NextResponse.json({ caixaAberto })
  } catch (error) {
    console.error('Erro ao buscar caixa:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

// POST - Abrir ou Fechar caixa
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const body = await request.json()
    const { action, saldoInicial, saldoFinal } = body

    if (action === 'abrir') {
      // Verificar se já tem caixa aberto
      const caixaExistente = await prisma.caixa.findFirst({
        where: {
          usuarioId: session.user.id,
          status: 'ABERTO'
        }
      })

      if (caixaExistente) {
        return NextResponse.json(
          { error: 'Você já possui um caixa aberto!' },
          { status: 400 }
        )
      }

      if (!saldoInicial || saldoInicial < 0) {
        return NextResponse.json(
          { error: 'Saldo inicial inválido' },
          { status: 400 }
        )
      }

      if (!session.user.empresaId) {
        return NextResponse.json(
          { error: 'Empresa não identificada' },
          { status: 400 }
        )
      }

      const novoCaixa = await prisma.caixa.create({
        data: {
          usuarioId: session.user.id,
          empresaId: session.user.empresaId,
          saldoInicial: saldoInicial,
          status: 'ABERTO'
        }
      })

      return NextResponse.json({
        success: true,
        message: 'Caixa aberto com sucesso!',
        caixa: novoCaixa
      })
    }

    if (action === 'fechar') {
      // Buscar caixa aberto
      const caixaAberto = await prisma.caixa.findFirst({
        where: {
          usuarioId: session.user.id,
          status: 'ABERTO'
        }
      })

      if (!caixaAberto) {
        return NextResponse.json(
          { error: 'Você não possui um caixa aberto!' },
          { status: 400 }
        )
      }

      if (typeof saldoFinal !== 'number' || saldoFinal < 0) {
        return NextResponse.json(
          { error: 'Saldo final inválido' },
          { status: 400 }
        )
      }

      // Calcular vendas do período
      const vendasPeriodo = await prisma.sale.aggregate({
        where: {
          userId: session.user.id,
          dataHora: {
            gte: caixaAberto.dataAbertura
          }
        },
        _sum: {
          valorTotal: true
        }
      })

      const totalVendas = Number(vendasPeriodo._sum.valorTotal || 0)
      const saldoEsperado = Number(caixaAberto.saldoInicial) + totalVendas
      const quebraDeCaixa = saldoFinal - saldoEsperado

      const caixaFechado = await prisma.caixa.update({
        where: { id: caixaAberto.id },
        data: {
          saldoFinal,
          quebraDeCaixa,
          status: 'FECHADO',
          dataFechamento: new Date()
        }
      })

      return NextResponse.json({
        success: true,
        message: 'Caixa fechado com sucesso!',
        caixa: caixaFechado,
        detalhes: {
          saldoInicial: Number(caixaAberto.saldoInicial),
          totalVendas,
          saldoEsperado,
          saldoFinal,
          quebraDeCaixa
        }
      })
    }

    return NextResponse.json(
      { error: 'Ação inválida' },
      { status: 400 }
    )

  } catch (error) {
    console.error('Erro na operação de caixa:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
