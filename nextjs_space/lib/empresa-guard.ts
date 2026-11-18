import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export type ResultadoGuardaEmpresa =
  | { ok: true; userId: string; empresaId: string }
  | { ok: false; status: number; erro: string };

/**
 * Guarda rigorosa para endpoints de administração da própria empresa.
 *
 * Requisitos:
 * 1. Sessão ativa obrigatória (401 se ausente).
 * 2. Role deve ser estritamente "admin" (403 se master, gerente, caixa ou outro).
 *    (Master edita empresas pelo fluxo /api/master/empresas; gerente e caixa não têm permissão).
 * 3. empresaId deve existir na sessão (403 se ausente).
 * 4. Para mutações (PATCH/POST/PUT/DELETE): validação de defesa em profundidade CSRF
 *    garantindo que o header Origin, se enviado, coincida com o header Host.
 */
export async function exigirAdminEmpresa(
  request: NextRequest,
  opcoes: { mutacao?: boolean } = {},
): Promise<ResultadoGuardaEmpresa> {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return { ok: false, status: 401, erro: "não_autenticado" };
  }

  if (session.user.role !== "admin" || !session.user.empresaId) {
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

  return {
    ok: true,
    userId: session.user.id ?? "",
    empresaId: session.user.empresaId,
  };
}
