
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

export const dynamic = "force-dynamic"

const prisma = new PrismaClient()

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || (session.user.role !== 'admin' && session.user.role !== 'master')) {
      return NextResponse.json(
        { error: 'Acesso negado. Apenas administradores podem atualizar produtos.' },
        { status: 403 }
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
    const { nome, sku, precoVenda, estoqueAtual, estoqueMinimo, imagemUrl } = body

    if (!nome || !sku || precoVenda === undefined || estoqueAtual === undefined) {
      return NextResponse.json(
        { error: 'Todos os campos obrigatórios devem ser preenchidos' },
        { status: 400 }
      )
    }

    if (precoVenda <= 0) {
      return NextResponse.json(
        { error: 'Preço deve ser maior que zero' },
        { status: 400 }
      )
    }

    if (estoqueAtual < 0) {
      return NextResponse.json(
        { error: 'Estoque não pode ser negativo' },
        { status: 400 }
      )
    }

    if (estoqueMinimo !== undefined && estoqueMinimo < 0) {
      return NextResponse.json(
        { error: 'Estoque mínimo não pode ser negativo' },
        { status: 400 }
      )
    }

    // Verificar se o produto existe e pertence à empresa
    const existingProduct = await prisma.product.findFirst({
      where: { 
        id: params.id,
        empresaId: empresaId
      }
    })

    if (!existingProduct) {
      return NextResponse.json(
        { error: 'Produto não encontrado ou não pertence à sua empresa' },
        { status: 404 }
      )
    }

    // Verificar se SKU já existe em outro produto
    if (sku !== existingProduct.sku) {
      const skuExists = await prisma.product.findUnique({
        where: { sku }
      })

      if (skuExists) {
        return NextResponse.json(
          { error: 'SKU já existe em outro produto. Escolha um SKU único.' },
          { status: 400 }
        )
      }
    }

    const product = await prisma.product.update({
      where: { id: params.id },
      data: {
        nome,
        sku,
        precoVenda,
        estoqueAtual,
        estoqueMinimo: estoqueMinimo !== undefined ? estoqueMinimo : existingProduct.estoqueMinimo,
        imagemUrl: imagemUrl !== undefined ? imagemUrl : existingProduct.imagemUrl
      },
    })

    return NextResponse.json({
      message: 'Produto atualizado com sucesso',
      product: {
        ...product,
        precoVenda: Number(product.precoVenda)
      }
    })
  } catch (error) {
    console.error('Erro ao atualizar produto:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || (session.user.role !== 'admin' && session.user.role !== 'master')) {
      return NextResponse.json(
        { error: 'Acesso negado. Apenas administradores podem excluir produtos.' },
        { status: 403 }
      )
    }

    const empresaId = session.user.empresaId

    if (!empresaId) {
      return NextResponse.json(
        { error: 'Empresa não identificada' },
        { status: 400 }
      )
    }

    // Verificar se o produto existe e pertence à empresa
    const existingProduct = await prisma.product.findFirst({
      where: { 
        id: params.id,
        empresaId: empresaId
      }
    })

    if (!existingProduct) {
      return NextResponse.json(
        { error: 'Produto não encontrado ou não pertence à sua empresa' },
        { status: 404 }
      )
    }

    // Verificar se o produto já foi vendido
    const hasBeenSold = await prisma.saleItem.findFirst({
      where: { productId: params.id }
    })

    if (hasBeenSold) {
      return NextResponse.json(
        { error: 'Não é possível excluir este produto pois ele já foi vendido.' },
        { status: 400 }
      )
    }

    await prisma.product.delete({
      where: { id: params.id }
    })

    return NextResponse.json({
      message: 'Produto excluído com sucesso'
    })
  } catch (error) {
    console.error('Erro ao excluir produto:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
