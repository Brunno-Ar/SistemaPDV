import { NextResponse } from "next/server";

export function validateProductData(body: any) {
  const { nome, precoVenda, precoCompra, estoqueAtual, estoqueMinimo } = body;

  if (
    !nome ||
    precoVenda === undefined ||
    precoCompra === undefined ||
    estoqueAtual === undefined
  ) {
    return {
      isValid: false,
      response: NextResponse.json(
        { error: "Todos os campos obrigatórios devem ser preenchidos" },
        { status: 400 }
      ),
    };
  }

  if (precoVenda <= 0 || precoCompra < 0) {
    return {
      isValid: false,
      response: NextResponse.json(
        {
          error:
            "Preços devem ser válidos (preço de venda > 0, preço de compra >= 0)",
        },
        { status: 400 }
      ),
    };
  }

  if (estoqueAtual < 0) {
    return {
      isValid: false,
      response: NextResponse.json(
        { error: "Estoque não pode ser negativo" },
        { status: 400 }
      ),
    };
  }

  if (estoqueMinimo !== undefined && estoqueMinimo < 0) {
    return {
      isValid: false,
      response: NextResponse.json(
        { error: "Estoque mínimo não pode ser negativo" },
        { status: 400 }
      ),
    };
  }

  return { isValid: true };
}
