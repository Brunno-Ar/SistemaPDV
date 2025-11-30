
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from "@/lib/db";
import { TipoMovimentacaoCaixa } from '@prisma/client';

export const dynamic = "force-dynamic"

// GET - Buscar caixa aberto do usuário e status
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
      include: {
        movimentacoes: {
          orderBy: {
            dataHora: 'desc'
          }
        }
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

// POST - Ações do Caixa
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const body = await request.json()
    const { action, saldoInicial, valor, descricao, valorInformado } = body

    // === ABRIR CAIXA ===
    if (action === 'abrir') {
      const caixaExistente = await prisma.caixa.findFirst({
        where: {
          usuarioId: session.user.id,
          status: 'ABERTO'
        }
      })

      if (caixaExistente) {
        return NextResponse.json({ error: 'Você já possui um caixa aberto!' }, { status: 400 })
      }

      if (saldoInicial === undefined || saldoInicial === null || Number(saldoInicial) < 0) {
        return NextResponse.json({ error: 'Saldo inicial inválido' }, { status: 400 })
      }

      if (!session.user.empresaId) {
        return NextResponse.json({ error: 'Empresa não identificada' }, { status: 400 })
      }

      // Transaction to create Caixa AND Initial Movement
      const result = await prisma.$transaction(async (tx) => {
        const novoCaixa = await tx.caixa.create({
          data: {
            usuarioId: session.user.id,
            empresaId: session.user.empresaId!,
            saldoInicial: Number(saldoInicial),
            status: 'ABERTO'
          }
        })

        await tx.movimentacaoCaixa.create({
          data: {
            caixaId: novoCaixa.id,
            usuarioId: session.user.id,
            tipo: TipoMovimentacaoCaixa.ABERTURA,
            valor: Number(saldoInicial),
            descricao: 'Abertura de Caixa'
          }
        })

        return novoCaixa
      })

      return NextResponse.json({
        success: true,
        message: 'Caixa aberto com sucesso!',
        caixa: result
      })
    }

    // Para as próximas ações, precisamos do caixa aberto
    const caixaAberto = await prisma.caixa.findFirst({
      where: {
        usuarioId: session.user.id,
        status: 'ABERTO'
      }
    })

    if (!caixaAberto) {
      return NextResponse.json({ error: 'Você não possui um caixa aberto!' }, { status: 400 })
    }

    // === SANGRIA / SUPRIMENTO ===
    if (action === 'sangria' || action === 'suprimento') {
      if (!valor || Number(valor) <= 0) {
        return NextResponse.json({ error: 'Valor inválido' }, { status: 400 })
      }

      const tipo = action === 'sangria'
        ? TipoMovimentacaoCaixa.SANGRIA
        : TipoMovimentacaoCaixa.SUPRIMENTO

      const mov = await prisma.movimentacaoCaixa.create({
        data: {
          caixaId: caixaAberto.id,
          usuarioId: session.user.id,
          tipo: tipo,
          valor: Number(valor),
          descricao: descricao || ''
        }
      })

      return NextResponse.json({
        success: true,
        message: `${action === 'sangria' ? 'Sangria' : 'Suprimento'} realizado com sucesso!`,
        movimentacao: mov
      })
    }

    // === FECHAR CAIXA ===
    if (action === 'fechar') {
      if (valorInformado === undefined || valorInformado === null || Number(valorInformado) < 0) {
        return NextResponse.json({ error: 'Valor informado inválido' }, { status: 400 })
      }

      // 1. Calcular vendas em DINHEIRO do usuário desde a abertura
      const vendasDinheiro = await prisma.sale.aggregate({
        where: {
          userId: session.user.id,
          dataHora: { gte: caixaAberto.dataAbertura },
          metodoPagamento: 'dinheiro'
        },
        _sum: {
          valorTotal: true
        }
      })
      const totalVendasDinheiro = Number(vendasDinheiro._sum.valorTotal || 0)

      // 2. Calcular Movimentações (Sangrias e Suprimentos)
      const movimentacoes = await prisma.movimentacaoCaixa.groupBy({
        by: ['tipo'],
        where: {
          caixaId: caixaAberto.id
        },
        _sum: {
          valor: true
        }
      })

      let totalSangrias = 0
      let totalSuprimentos = 0

      movimentacoes.forEach(mov => {
        if (mov.tipo === TipoMovimentacaoCaixa.SANGRIA) {
          totalSangrias = Number(mov._sum.valor || 0)
        } else if (mov.tipo === TipoMovimentacaoCaixa.SUPRIMENTO) {
          totalSuprimentos = Number(mov._sum.valor || 0)
        }
      })

      // 3. Calcular Saldo Teórico
      // SaldoTeorico = SaldoInicial + VendasDinheiro + Suprimentos - Sangrias
      const saldoInicial = Number(caixaAberto.saldoInicial)
      const saldoTeorico = saldoInicial + totalVendasDinheiro + totalSuprimentos - totalSangrias

      // 4. Calcular Quebra
      const valorFinalInformado = Number(valorInformado)
      const quebraDeCaixa = valorFinalInformado - saldoTeorico

      // 5. Atualizar Caixa
      const caixaFechado = await prisma.caixa.update({
        where: { id: caixaAberto.id },
        data: {
          saldoFinal: valorFinalInformado,
          quebraDeCaixa: quebraDeCaixa,
          status: 'FECHADO',
          dataFechamento: new Date()
        }
      })

      return NextResponse.json({
        success: true,
        message: 'Caixa fechado com sucesso!',
        caixa: caixaFechado,
        // Retornamos detalhes para debug/log, mas o front não deve mostrar antes de confirmar
        detalhes: {
          saldoInicial,
          totalVendasDinheiro,
          totalSuprimentos,
          totalSangrias,
          saldoTeorico,
          valorInformado: valorFinalInformado,
          quebraDeCaixa
        }
      })
    }

    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })

  } catch (error) {
    console.error('Erro na operação de caixa:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
