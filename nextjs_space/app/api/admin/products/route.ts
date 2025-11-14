
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

export const dynamic = "force-dynamic"

const prisma = new PrismaClient()

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || (session.user.role !== 'admin' && session.user.role !== 'master')) {
      return NextResponse.json(
        { error: 'Acesso negado. Apenas administradores podem acessar.' },
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

    const products = await prisma.product.findMany({
      where: {
        empresaId: empresaId,
      },
      orderBy: { createdAt: 'desc' }
    })

    // Converter Decimal para number para serialização JSON
    const serializedProducts = products.map(product => ({
      ...product,
      precoVenda: Number(product.precoVenda)
    }))

    return NextResponse.json(serializedProducts)
  } catch (error) {
    console.error('Erro ao buscar produtos:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || (session.user.role !== 'admin' && session.user.role !== 'master')) {
      return NextResponse.json(
        { error: 'Acesso negado. Apenas administradores podem criar produtos.' },
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

    // Verificar se SKU já existe
    const existingProduct = await prisma.product.findUnique({
      where: { sku }
    })

    if (existingProduct) {
      return NextResponse.json(
        { error: 'SKU já existe. Escolha um SKU único.' },
        { status: 400 }
      )
    }

    const product = await prisma.product.create({
      data: {
        nome,
        sku,
        precoVenda,
        estoqueAtual,
        estoqueMinimo: estoqueMinimo || 0,
        empresaId,
        imagemUrl: imagemUrl || null
      },
    })

    return NextResponse.json({
      message: 'Produto criado com sucesso',
      product: {
        ...product,
        precoVenda: Number(product.precoVenda)
      }
    })
  } catch (error) {
    console.error('Erro ao criar produto:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
