import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// Função para gerar SKU único
async function generateUniqueSKU(prisma: PrismaClient): Promise<string> {
  let sku = "";
  let exists = true;
  while (exists) {
    const letters = Array(3)
      .fill(null)
      .map(() => String.fromCharCode(65 + Math.floor(Math.random() * 26)))
      .join("");
    const numbers = Array(6)
      .fill(null)
      .map(() => Math.floor(Math.random() * 10))
      .join("");
    sku = `${letters}-${numbers}`;
    const existing = await prisma.product.findFirst({ where: { sku } });
    exists = !!existing;
  }
  return sku;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (
      !session?.user ||
      (session.user.role !== "admin" && session.user.role !== "master")
    ) {
      return NextResponse.json(
        {
          error:
            "Acesso negado. Apenas administradores podem atualizar produtos.",
        },
        { status: 403 }
      );
    }
    const empresaId = session.user.empresaId;
    if (!empresaId) {
      return NextResponse.json(
        { error: "Empresa não identificada" },
        { status: 400 }
      );
    }
    const body = await request.json();
    const {
      nome,
      sku,
      precoVenda,
      precoCompra,
      estoqueAtual,
      estoqueMinimo,
      imagemUrl,
      categoryId,
    } = body;
    // Validate required fields
    if (
      !nome ||
      precoVenda === undefined ||
      precoCompra === undefined ||
      estoqueAtual === undefined
    ) {
      return NextResponse.json(
        { error: "Todos os campos obrigatórios devem ser preenchidos" },
        { status: 400 }
      );
    }
    if (precoVenda <= 0 || precoCompra < 0) {
      return NextResponse.json(
        {
          error:
            "Preços devem ser válidos (preço de venda > 0, preço de compra >= 0)",
        },
        { status: 400 }
      );
    }
    if (estoqueAtual < 0) {
      return NextResponse.json(
        { error: "Estoque não pode ser negativo" },
        { status: 400 }
      );
    }
    if (estoqueMinimo !== undefined && estoqueMinimo < 0) {
      return NextResponse.json(
        { error: "Estoque mínimo não pode ser negativo" },
        { status: 400 }
      );
    }
    // Verify product belongs to the company
    const existingProduct = await prisma.product.findFirst({
      where: { id: params.id, empresaId },
    });
    if (!existingProduct) {
      return NextResponse.json(
        { error: "Produto não encontrado ou não pertence à sua empresa" },
        { status: 404 }
      );
    }
    // Check for duplicate name
    if (nome.trim() !== existingProduct.nome) {
      const duplicate = await prisma.product.findFirst({
        where: {
          nome: nome.trim(),
          empresaId,
          id: { not: params.id },
        },
      });
      if (duplicate) {
        return NextResponse.json(
          {
            error: `Já existe outro produto chamado "${nome}" cadastrado nesta empresa. Use um nome diferente.`,
          },
          { status: 409 }
        );
      }
    }
    // Handle SKU generation / uniqueness
    let finalSku = sku;
    if (!finalSku || finalSku.trim() === "") {
      if (existingProduct.sku && existingProduct.sku.trim() !== "") {
        finalSku = existingProduct.sku;
      } else {
        finalSku = await generateUniqueSKU(prisma);
      }
    }
    if (finalSku !== existingProduct.sku) {
      const skuExists = await prisma.product.findFirst({
        where: { sku: finalSku, empresaId },
      });
      if (skuExists) {
        return NextResponse.json(
          { error: "SKU já existe em outro produto. Escolha um SKU único." },
          { status: 400 }
        );
      }
    }
    // Update product and record movement in transaction
    const result = await prisma.$transaction(async (tx: any) => {
      // 1. Update product
      const product = await tx.product.update({
        where: { id: params.id },
        data: {
          nome,
          sku: finalSku,
          precoVenda,
          precoCompra:
            precoCompra !== undefined
              ? precoCompra
              : existingProduct.precoCompra,
          estoqueAtual,
          estoqueMinimo:
            estoqueMinimo !== undefined
              ? estoqueMinimo
              : existingProduct.estoqueMinimo,
          imagemUrl:
            imagemUrl !== undefined ? imagemUrl : existingProduct.imagemUrl,
          categoryId: categoryId ?? null,
        },
      });

      // 2. Detect changes
      const changes = [];
      if (nome !== existingProduct.nome) {
        changes.push(`Nome: ${existingProduct.nome} -> ${nome}`);
      }
      if (finalSku !== existingProduct.sku) {
        changes.push(`SKU: ${existingProduct.sku} -> ${finalSku}`);
      }
      if (Number(precoVenda) !== Number(existingProduct.precoVenda)) {
        changes.push(
          `Venda: R$${Number(existingProduct.precoVenda).toFixed(
            2
          )} -> R$${Number(precoVenda).toFixed(2)}`
        );
      }
      if (estoqueAtual !== existingProduct.estoqueAtual) {
        const diff = estoqueAtual - existingProduct.estoqueAtual;
        changes.push(
          `Estoque: ${existingProduct.estoqueAtual} -> ${estoqueAtual} (${
            diff > 0 ? "+" : ""
          }${diff})`
        );
      }
      if (
        estoqueMinimo !== undefined &&
        estoqueMinimo !== existingProduct.estoqueMinimo
      ) {
        changes.push(
          `Estoque Mín: ${existingProduct.estoqueMinimo} -> ${estoqueMinimo}`
        );
      }

      // 3. Create movement record if there are changes
      if (changes.length > 0) {
        await tx.movimentacaoEstoque.create({
          data: {
            produtoId: product.id,
            usuarioId: session.user.id,
            empresaId,
            tipo: "AJUSTE_INVENTARIO",
            quantidade: estoqueAtual - existingProduct.estoqueAtual,
            motivo: `Edição de Produto: ${changes.join(", ")}`,
          },
        });
      }

      return product;
    });

    return NextResponse.json({
      message: "Produto atualizado com sucesso",
      product: {
        ...result,
        precoVenda: Number(result.precoVenda),
        precoCompra: Number(result.precoCompra),
      },
    });
  } catch (error) {
    console.error("Erro ao atualizar produto:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (
      !session?.user ||
      (session.user.role !== "admin" && session.user.role !== "master")
    ) {
      return NextResponse.json(
        {
          error:
            "Acesso negado. Apenas administradores podem excluir produtos.",
        },
        { status: 403 }
      );
    }
    const empresaId = session.user.empresaId;
    if (!empresaId) {
      return NextResponse.json(
        { error: "Empresa não identificada" },
        { status: 400 }
      );
    }
    const existingProduct = await prisma.product.findFirst({
      where: { id: params.id, empresaId },
    });
    if (!existingProduct) {
      return NextResponse.json(
        { error: "Produto não encontrado ou não pertence à sua empresa" },
        { status: 404 }
      );
    }
    // Delete associated sale items (WARNING: This alters historical sales data)
    await prisma.saleItem.deleteMany({
      where: { productId: params.id },
    });
    // Delete associated stock movements first
    await prisma.movimentacaoEstoque.deleteMany({
      where: { produtoId: params.id },
    });

    // Delete associated lots (explicitly, though cascade might handle it)
    await prisma.lote.deleteMany({
      where: { produtoId: params.id },
    });

    await prisma.product.delete({ where: { id: params.id } });
    return NextResponse.json({ message: "Produto excluído com sucesso" });
  } catch (error) {
    console.error("Erro ao excluir produto:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
