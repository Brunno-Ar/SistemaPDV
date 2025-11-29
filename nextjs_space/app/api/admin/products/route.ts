import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// Função para gerar SKU único
async function generateUniqueSKU(): Promise<string> {
  let sku = "";
  let exists = true;

  while (exists) {
    // Gerar SKU: 3 letras maiúsculas + 6 dígitos
    const letters = Array(3)
      .fill(null)
      .map(() => String.fromCharCode(65 + Math.floor(Math.random() * 26)))
      .join("");

    const numbers = Array(6)
      .fill(null)
      .map(() => Math.floor(Math.random() * 10))
      .join("");

    sku = `${letters}-${numbers}`;

    // Verificar se já existe
    const existingProduct = await prisma.product.findUnique({
      where: { sku },
    });

    exists = !!existingProduct;
  }

  return sku;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (
      !session?.user ||
      (session.user.role !== "admin" && session.user.role !== "master")
    ) {
      return NextResponse.json(
        { error: "Acesso negado. Apenas administradores podem acessar." },
        { status: 403 }
      );
    }

    // 🔥 MASTER MODE: Verificar se há companyId na query
    const { searchParams } = new URL(request.url);
    const companyIdParam = searchParams.get("companyId");

    let empresaId: string | undefined;

    if (companyIdParam) {
      // Se há companyId, VALIDAR se usuário é MASTER
      if (session.user.role !== "master") {
        return NextResponse.json(
          {
            error:
              "Acesso negado. Apenas usuários master podem visualizar dados de outras empresas.",
          },
          { status: 403 }
        );
      }
      empresaId = companyIdParam;
    } else {
      // Uso normal: pegar empresaId da sessão
      empresaId = session.user.empresaId || undefined;
    }

    if (!empresaId) {
      return NextResponse.json(
        { error: "Empresa não identificada" },
        { status: 400 }
      );
    }

    const products = await prisma.product.findMany({
      where: {
        empresaId: empresaId,
      },
      orderBy: {
        nome: "asc",
      },
      include: {
        category: {
          select: {
            nome: true,
          },
        },
        lotes: {
          where: {
            quantidade: { gt: 0 },
          },
        },
      },
    });

    // Converter Decimal para number para serialização JSON e calcular custo médio
    const serializedProducts = products.map((product: any) => {
      // Calcular custo médio ponderado baseado nos lotes ativos
      let custoMedioCalculado = Number(product.precoCompra);

      if (product.lotes && product.lotes.length > 0) {
        const totalValor = product.lotes.reduce((acc: number, lote: any) => {
          return acc + Number(lote.precoCompra) * lote.quantidade;
        }, 0);

        const totalQuantidade = product.lotes.reduce(
          (acc: number, lote: any) => {
            return acc + lote.quantidade;
          },
          0
        );

        if (totalQuantidade > 0) {
          custoMedioCalculado = totalValor / totalQuantidade;
        }
      }

      return {
        ...product,
        precoCompra: custoMedioCalculado, // Substitui pelo valor calculado
        precoVenda: Number(product.precoVenda),
        lotes: undefined, // Não precisa enviar os lotes na lista de produtos
      };
    });

    return NextResponse.json(serializedProducts);
  } catch (error) {
    console.error("Erro ao buscar produtos:", error);
    return NextResponse.json(
      { error: "Erro interno ao buscar produtos" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (
      !session?.user ||
      (session.user.role !== "admin" && session.user.role !== "master")
    ) {
      return NextResponse.json(
        {
          error: "Acesso negado. Apenas administradores podem criar produtos.",
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
      loteInicial,
      validadeInicial,
      categoryId,
      dataCompraInicial,
    } = body;

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

    // 🔥 VALIDAÇÃO: Verificar se já existe produto com mesmo nome na empresa
    const existingProductByName = await prisma.product.findFirst({
      where: {
        nome: nome.trim(),
        empresaId: empresaId,
      },
    });

    if (existingProductByName) {
      return NextResponse.json(
        {
          error: `Já existe um produto chamado "${nome}" cadastrado nesta empresa. Use um nome diferente.`,
        },
        { status: 409 } // 409 Conflict
      );
    }

    // Validação do lote inicial
    if (loteInicial !== undefined) {
      const quantidadeLote = parseInt(loteInicial);
      if (quantidadeLote < 0) {
        return NextResponse.json(
          { error: "Quantidade do lote não pode ser negativa" },
          { status: 400 }
        );
      }

      if (quantidadeLote > 0 && !validadeInicial) {
        // Opcional: validar validade se necessário
      }
    }

    // Gerar SKU se não fornecido
    let productSku = sku;
    if (!productSku || productSku.trim() === "") {
      productSku = await generateUniqueSKU();
    } else {
      // Verificar se SKU já existe
      const existingProduct = await prisma.product.findUnique({
        where: { sku: productSku },
      });

      if (existingProduct) {
        return NextResponse.json(
          { error: "SKU já existe. Escolha outro." },
          { status: 400 }
        );
      }
    }

    // 🔥 TRANSACTION: Criar produto + lote simultaneamente
    const result = await prisma.$transaction(async (tx: any) => {
      // 1. Criar o produto
      const product = await tx.product.create({
        data: {
          nome,
          sku: productSku,
          precoVenda,
          precoCompra: precoCompra || 0,
          estoqueAtual:
            loteInicial && parseInt(loteInicial) > 0
              ? parseInt(loteInicial)
              : estoqueAtual,
          estoqueMinimo: estoqueMinimo || 5,
          empresaId,
          imagemUrl: imagemUrl || null,
          categoryId: categoryId || null,
        },
      });

      // 2. Se houver lote inicial, criar o lote
      let lote = null;
      if (loteInicial && parseInt(loteInicial) > 0) {
        const quantidadeLote = parseInt(loteInicial);

        // Gerar número do lote automaticamente (formato: LOTE-YYYYMMDD-XXXXX)
        const dataAtual = new Date();
        const dataFormatada = dataAtual
          .toISOString()
          .split("T")[0]
          .replace(/-/g, "");
        const numeroAleatorio = Math.floor(Math.random() * 99999)
          .toString()
          .padStart(5, "0");
        const numeroLote = `LOTE-${dataFormatada}-${numeroAleatorio}`;

        lote = await tx.lote.create({
          data: {
            numeroLote,
            dataValidade: validadeInicial
              ? new Date(validadeInicial + "T12:00:00Z")
              : null,
            quantidade: quantidadeLote,
            produtoId: product.id,
            precoCompra: precoCompra || 0,
            dataCompra: dataCompraInicial
              ? new Date(dataCompraInicial + "T12:00:00Z")
              : undefined,
          },
        });

        // 3. Registrar movimentação de entrada
        await tx.movimentacaoEstoque.create({
          data: {
            produtoId: product.id,
            usuarioId: session.user.id,
            empresaId: empresaId,
            tipo: "ENTRADA",
            quantidade: quantidadeLote,
            motivo: "Estoque Inicial (Cadastro de Produto)",
          },
        });
      }

      return { product, lote };
    });

    const responseMessage = result.lote
      ? `Produto e lote inicial criados com sucesso! Lote: ${result.lote.numeroLote}`
      : "Produto criado com sucesso";

    return NextResponse.json({
      message: responseMessage,
      product: {
        ...result.product,
        precoVenda: Number(result.product.precoVenda),
        precoCompra: Number(result.product.precoCompra),
      },
      lote: result.lote
        ? {
            ...result.lote,
            dataValidade: result.lote.dataValidade
              ? result.lote.dataValidade.toISOString()
              : null,
          }
        : null,
    });
  } catch (error) {
    console.error("Erro ao criar produto:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
