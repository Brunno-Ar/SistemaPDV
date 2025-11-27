
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
    const { nome, sku, precoVenda, precoCompra, estoqueAtual, estoqueMinimo, imagemUrl } = body

    if (!nome || !sku || precoVenda === undefined || precoCompra === undefined || estoqueAtual === undefined) {
      return NextResponse.json(
        { error: 'Todos os campos obrigatórios devem ser preenchidos' },
        { status: 400 }
      )
    }

    if (precoVenda <= 0 || precoCompra < 0) {
      return NextResponse.json(
        { error: 'Preços devem ser válidos (preço de venda > 0, preço de compra >= 0)' },
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

    // 🔥 VALIDAÇÃO: Verificar se o novo nome já existe em outro produto da empresa
    if (nome.trim() !== existingProduct.nome) {
      const productWithSameName = await prisma.product.findFirst({
        where: {
          nome: nome.trim(),
          empresaId: empresaId,
          id: {
            not: params.id // Excluir o próprio produto da busca
          }
        }
      })

      if (productWithSameName) {
        return NextResponse.json(
          { error: `Já existe outro produto chamado "${nome}" cadastrado nesta empresa. Use um nome diferente.` },
          { status: 409 } // 409 Conflict
        )
      }
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
        precoCompra: precoCompra !== undefined ? precoCompra : existingProduct.precoCompra,
        estoqueAtual,
        estoqueMinimo: estoqueMinimo !== undefined ? estoqueMinimo : existingProduct.estoqueMinimo,
        imagemUrl: imagemUrl !== undefined ? imagemUrl : existingProduct.imagemUrl
      },
    })

    return NextResponse.json({
      message: 'Produto atualizado com sucesso',
      product: {
        ...product,
        precoVenda: Number(product.precoVenda),
        precoCompra: Number(product.precoCompra)
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
