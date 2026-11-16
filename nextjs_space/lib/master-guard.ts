/**
 * Guarda comum dos endpoints de administracao do painel master.
 *
 * Duas checagens, nesta ordem:
 *  1. sessao com role `master` (a mesma fonte que o resto do painel);
 *  2. para escrita, mesma origem: se o navegador mandar `Origin`, ele tem que
 *     bater com o `Host` da requisicao. E defesa em profundidade contra CSRF
 *     (o cookie de sessao ja e SameSite), sem inventar token proprio.
 */

import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export type ResultadoGuarda =
  | { ok: true; userId: string | null }
  | { ok: false; status: number; erro: string };

export async function exigirMaster(
  request: NextRequest,
  opcoes: { mutacao?: boolean } = {},
): Promise<ResultadoGuarda> {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== "master") {
    return { ok: false, status: 403, erro: "acesso_negado" };
  }

  if (opcoes.mutacao) {
    const origin = request.headers.get("origin");
    const host = request.headers.get("host");

    if (origin) {
      try {
        if (new URL(origin).host !== host) {
          return { ok: false, status: 403, erro: "origem_invalida" };
        }
      } catch {
        return { ok: false, status: 403, erro: "origem_invalida" };
      }
    }
  }

  return { ok: true, userId: session.user.id ?? null };
}
