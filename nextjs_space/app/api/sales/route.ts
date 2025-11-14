
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

export const dynamic = "force-dynamic"

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const empresaId = session.user.empresaId

    if (!empresaId) {
      return NextResponse.json(
        { error: 'Empresa não identificada' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { items, metodoPagamento, valorTotal } = body

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Itens são obrigatórios' },
        { status: 400 }
      )
    }

    if (!metodoPagamento || !['dinheiro', 'debito', 'credito', 'pix'].includes(metodoPagamento)) {
      return NextResponse.json(
        { error: 'Método de pagamento inválido' },
        { status: 400 }
      )
    }

    // Verificar estoque e buscar produtos (apenas da empresa do usuário)
    const productIds = items.map(item => item.productId)
    const products = await prisma.product.findMany({
      where: { 
        id: { in: productIds },
        empresaId: empresaId
      }
    })

    if (products.length !== productIds.length) {
      return NextResponse.json(
        { error: 'Produtos não encontrados ou não pertencem à sua empresa' },
        { status: 400 }
      )
    }

    // Verificar se há estoque suficiente para todos os itens
    for (const item of items) {
      const product = products.find(p => p.id === item.productId)
      if (!product) {
        return NextResponse.json(
          { error: `Produto não encontrado: ${item.productId}` },
          { status: 400 }
        )
      }

      if (product.estoqueAtual < item.quantidade) {
        return NextResponse.json(
          { error: `Estoque insuficiente para ${product.nome}. Disponível: ${product.estoqueAtual}` },
          { status: 400 }
        )
      }
    }

    // Criar a transação de venda
    const result = await prisma.$transaction(async (tx) => {
      // Criar a venda
      const sale = await tx.sale.create({
        data: {
          userId: session.user.id,
          empresaId: empresaId,
          valorTotal: valorTotal,
          metodoPagamento: metodoPagamento,
        },
      })

      // Criar os itens da venda, movimentações de estoque e abater estoque
      for (const item of items) {
        const product = products.find(p => p.id === item.productId)!
        
        // Criar item da venda
        await tx.saleItem.create({
          data: {
            saleId: sale.id,
            productId: item.productId,
            quantidade: item.quantidade,
            precoUnitario: item.precoUnitario,
            subtotal: item.quantidade * item.precoUnitario,
          },
        })

        // Criar movimentação de estoque (negativa para venda)
        await tx.movimentacaoEstoque.create({
          data: {
            produtoId: item.productId,
            usuarioId: session.user.id,
            empresaId: empresaId,
            tipo: 'VENDA',
            quantidade: -item.quantidade, // Negativo porque é saída
            motivo: `Venda #${sale.id.substring(0, 8)}`,
          },
        })

        // Abater estoque
        await tx.product.update({
          where: { id: item.productId },
          data: {
            estoqueAtual: product.estoqueAtual - item.quantidade,
          },
        })
      }

      return sale
    })

    return NextResponse.json({
      message: 'Venda finalizada com sucesso',
      sale: {
        id: result.id,
        valorTotal: Number(result.valorTotal),
        metodoPagamento: result.metodoPagamento,
        dataHora: result.dataHora
      }
    })

  } catch (error) {
    console.error('Erro ao finalizar venda:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
