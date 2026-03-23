import { NextRequest, NextResponse } from "next/server";

interface BarcodeResult {
  found: boolean;
  source?: string;
  data?: {
    nome?: string;
    marca?: string;
    categoria?: string;
    imagemUrl?: string;
    peso?: string;
  };
}

async function lookupOpenFoodFacts(barcode: string): Promise<BarcodeResult> {
  try {
    const response = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${barcode}?fields=product_name,brands,categories,image_url,quantity`,
      {
        headers: { "User-Agent": "FlowPDV/1.0 (contact@flowpdv.com)" },
        signal: AbortSignal.timeout(5000),
      },
    );

    if (!response.ok) return { found: false };

    const json = await response.json();

    if (json.status !== 1 || !json.product) return { found: false };

    const p = json.product;
    return {
      found: true,
      source: "Open Food Facts",
      data: {
        nome: p.product_name || undefined,
        marca: p.brands || undefined,
        categoria: p.categories || undefined,
        imagemUrl: p.image_url || undefined,
        peso: p.quantity || undefined,
      },
    };
  } catch {
    return { found: false };
  }
}

async function lookupOSCBR(barcode: string): Promise<BarcodeResult> {
  try {
    const loginRes = await fetch(
      "https://api.gtin.rscsistemas.com.br/api/Auth/Login",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          usuario: process.env.OSCBR_USUARIO || "",
          senha: process.env.OSCBR_SENHA || "",
        }),
        signal: AbortSignal.timeout(5000),
      },
    );

    if (!loginRes.ok) return { found: false };

    const loginData = await loginRes.json();
    const token = loginData.token;
    if (!token) return { found: false };

    const productRes = await fetch(
      `https://api.gtin.rscsistemas.com.br/api/Produto/${barcode}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(5000),
      },
    );

    if (!productRes.ok) return { found: false };

    const product = await productRes.json();

    return {
      found: true,
      source: "OSCBR",
      data: {
        nome: product.descricao || undefined,
        marca: product.marca || undefined,
        categoria: product.ncm || undefined,
      },
    };
  } catch {
    return { found: false };
  }
}

export async function GET(request: NextRequest) {
  const barcode = request.nextUrl.searchParams.get("code");

  if (!barcode || barcode.length < 3) {
    return NextResponse.json(
      { error: "Código de barras inválido" },
      { status: 400 },
    );
  }

  const offResult = await lookupOpenFoodFacts(barcode);
  if (offResult.found) {
    return NextResponse.json(offResult);
  }

  const hasOSCBRCredentials =
    process.env.OSCBR_USUARIO && process.env.OSCBR_SENHA;

  if (hasOSCBRCredentials) {
    const oscbrResult = await lookupOSCBR(barcode);
    if (oscbrResult.found) {
      return NextResponse.json(oscbrResult);
    }
  }

  return NextResponse.json({
    found: false,
    message:
      "Produto não encontrado nas bases de dados. Preencha os dados manualmente.",
  });
}
