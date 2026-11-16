import { NextRequest, NextResponse } from "next/server";
import { exigirMaster } from "@/lib/master-guard";
import { aplicarConfirmacao } from "@/lib/master-asaas";

export const dynamic = "force-dynamic";

/**
 * Confirmacao do preview Asaas (UNICA porta de escrita).
 *
 * Exige `empresaId` + `token` emitido pelo preview. O servico revalida todo o
 * estado (Asaas + DB) e recusa token expirado/divergente: preview velho nunca
 * escreve. `confirmarTerminal: true` e o unico jeito de aplicar cancelamento
 * vindo do Asaas — e mesmo assim sem liberar ou criar nada.
 */
export async function POST(request: NextRequest) {
  const guarda = await exigirMaster(request, { mutacao: true });
  if (!guarda.ok) {
    return NextResponse.json(
      { ok: false, erro: guarda.erro },
      { status: guarda.status },
    );
  }

  let corpo: {
    empresaId?: unknown;
    token?: unknown;
    confirmarTerminal?: unknown;
    confirmarTermos?: unknown;
  };
  try {
    corpo = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, erro: "json_invalido" },
      { status: 400 },
    );
  }

  const empresaId =
    typeof corpo.empresaId === "string" ? corpo.empresaId : null;
  if (!empresaId) {
    return NextResponse.json(
      { ok: false, erro: "empresaId_obrigatorio" },
      { status: 400 },
    );
  }

  if (typeof corpo.token !== "string" || corpo.token.length === 0) {
    return NextResponse.json(
      { ok: false, erro: "preview_token_obrigatorio" },
      { status: 400 },
    );
  }

  const resultado = await aplicarConfirmacao({
    empresaId,
    token: corpo.token,
    confirmarTerminal: corpo.confirmarTerminal === true,
    confirmarTermos: corpo.confirmarTermos === true,
  });

  return NextResponse.json(resultado.body, { status: resultado.http });
}
