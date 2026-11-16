import { NextRequest, NextResponse } from "next/server";
import { exigirMaster } from "@/lib/master-guard";
import { montarPreview } from "@/lib/master-asaas";

export const dynamic = "force-dynamic";

/**
 * Preview do vinculo/provisionamento Asaas (SOMENTE LEITURA).
 *
 * Nao cria customer, nao cria assinatura, nao altera nada: apenas GETs no
 * Asaas + leitura local, devolvendo a proposta e um token curto de preview.
 * A escrita so acontece em POST /api/master/asaas/confirm.
 */
async function responder(
  empresaId: string | null,
  primeiroVencimento?: string | null,
) {
  if (!empresaId) {
    return NextResponse.json(
      { ok: false, erro: "empresaId_obrigatorio" },
      { status: 400 },
    );
  }

  const resultado = await montarPreview(empresaId, {
    primeiroVencimento: primeiroVencimento || undefined,
  });

  if (!resultado.ok) {
    return NextResponse.json(
      {
        ok: false,
        erro: resultado.erro,
        ...(resultado.motivo ? { motivo: resultado.motivo } : {}),
        ...(resultado.candidatos ? { candidatos: resultado.candidatos } : {}),
      },
      { status: resultado.http },
    );
  }

  return NextResponse.json({ ok: true, preview: resultado.preview });
}

export async function POST(request: NextRequest) {
  const guarda = await exigirMaster(request);
  if (!guarda.ok) {
    return NextResponse.json({ ok: false, erro: guarda.erro }, { status: guarda.status });
  }

  let empresaId: string | null = null;
  let primeiroVencimento: string | null = null;
  try {
    const body = await request.json();
    empresaId = typeof body?.empresaId === "string" ? body.empresaId : null;
    primeiroVencimento =
      typeof body?.primeiroVencimento === "string"
        ? body.primeiroVencimento
        : null;
  } catch {
    return NextResponse.json(
      { ok: false, erro: "json_invalido" },
      { status: 400 },
    );
  }

  return responder(empresaId, primeiroVencimento);
}

export async function GET(request: NextRequest) {
  const guarda = await exigirMaster(request);
  if (!guarda.ok) {
    return NextResponse.json({ ok: false, erro: guarda.erro }, { status: guarda.status });
  }

  return responder(
    request.nextUrl.searchParams.get("empresaId"),
    request.nextUrl.searchParams.get("primeiroVencimento"),
  );
}
