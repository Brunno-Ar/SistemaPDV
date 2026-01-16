import { NextRequest, NextResponse } from "next/server";
import { validateProductData } from "@/lib/validation/product";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateUniqueSKU } from "@/lib/product-utils";

export const dynamic = "force-dynamic";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (
      !session?.user ||
      (session.user.role !== "admin" &&
        session.user.role !== "master" &&
        session.user.role !== "gerente")
    ) {
      return NextResponse.json(
        {
          error:
            "Acesso negado. Apenas administradores podem atualizar produtos.",
        },
        { status: 403 },
      );
    }
    const empresaId = session.user.empresaId;
    if (!empresaId) {
      return NextResponse.json(
        { error: "Empresa não identificada" },
        { status: 400 },
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
    const validation = validateProductData(body);
    if (!validation.isValid) {
      return validation.response;
    }
    // Verify product belongs to the company
    const existingProduct = await prisma.product.findFirst({
      where: { id: params.id, empresaId },
    });
    if (!existingProduct) {
      return NextResponse.json(
        { error: "Produto não encontrado ou não pertence à sua empresa" },
        { status: 404 },
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
          { status: 409 },
        );
      }
    }
    // Handle SKU generation / uniqueness
    let finalSku = sku;
    if (!finalSku || finalSku.trim() === "") {
      if (existingProduct.sku && existingProduct.sku.trim() !== "") {
        finalSku = existingProduct.sku;
      } else {
        finalSku = await generateUniqueSKU(empresaId);
      }
    }
    if (finalSku !== existingProduct.sku) {
      const skuExists = await prisma.product.findFirst({
        where: { sku: finalSku, empresaId },
      });
      if (skuExists) {
        return NextResponse.json(
          { error: "SKU já existe em outro produto. Escolha um SKU único." },
          { status: 400 },
        );
      }
    }
    // Update product and record movement in transaction
    const result = await prisma.$transaction(async (tx) => {
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
            2,
          )} -> R$${Number(precoVenda).toFixed(2)}`,
        );
      }
      if (estoqueAtual !== existingProduct.estoqueAtual) {
        const diff = estoqueAtual - existingProduct.estoqueAtual;
        changes.push(
          `Estoque: ${existingProduct.estoqueAtual} -> ${estoqueAtual} (${
            diff > 0 ? "+" : ""
          }${diff})`,
        );
      }
      if (
        estoqueMinimo !== undefined &&
        estoqueMinimo !== existingProduct.estoqueMinimo
      ) {
        changes.push(
          `Estoque Mín: ${existingProduct.estoqueMinimo} -> ${estoqueMinimo}`,
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
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (
      !session?.user ||
      (session.user.role !== "admin" &&
        session.user.role !== "master" &&
        session.user.role !== "gerente")
    ) {
      return NextResponse.json(
        {
          error:
            "Acesso negado. Apenas administradores podem excluir produtos.",
        },
        { status: 403 },
      );
    }
    const empresaId = session.user.empresaId;
    if (!empresaId) {
      return NextResponse.json(
        { error: "Empresa não identificada" },
        { status: 400 },
      );
    }
    const existingProduct = await prisma.product.findFirst({
      where: { id: params.id, empresaId },
    });
    if (!existingProduct) {
      return NextResponse.json(
        { error: "Produto não encontrado ou não pertence à sua empresa" },
        { status: 404 },
      );
    }

    // Perform deletion in a transaction to ensure integrity
    await prisma.$transaction(async (tx) => {
      // Delete associated sale items (WARNING: This alters historical sales data)
      await tx.saleItem.deleteMany({
        where: { productId: params.id },
      });
      // Delete associated stock movements first
      await tx.movimentacaoEstoque.deleteMany({
        where: { produtoId: params.id },
      });

      // Delete associated lots (explicitly, though cascade might handle it)
      await tx.lote.deleteMany({
        where: { produtoId: params.id },
      });

      await tx.product.delete({ where: { id: params.id } });
    });

    return NextResponse.json({ message: "Produto excluído com sucesso" });
  } catch (error) {
    console.error("Erro ao excluir produto:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
