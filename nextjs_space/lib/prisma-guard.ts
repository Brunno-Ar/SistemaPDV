/**
 * Guard fail-closed: garante que testes de Jest nunca herdem DATABASE_URL/DIRECT_URL
 * de produção (Supabase ao vivo).
 *
 * Carregado como `setupFiles` do Jest (antes de qualquer import de Prisma / @/lib/db),
 * sobrescreve as URLs com um endereço dummy local e inalcançável. NÃO abre conexão.
 * NÃO acessa produção. NÃO edita .env nem .env.test.
 */

export const DUMMY_DATABASE_URL =
  "postgresql://flowpdv_guard_user:flowpdv_guard_pass@127.0.0.1:1/flowpdv_guard_dummy_db";

function looksLikeProductionUrl(url: string | undefined): boolean {
  if (!url) return false;
  const lowered = url.toLowerCase();
  const productionSignals = [
    "supabase.com",
    "supabase.co",
    "pooler.supabase",
    "rds.amazonaws.com",
    "aws.",
    "elephantsql",
    "herokuapp.com",
    "neon.tech",
    "cockroachdb.cloud",
  ];
  return productionSignals.some((signal) => lowered.includes(signal));
}

function isDummyOrLocal(url: string): boolean {
  const lowered = url.toLowerCase();
  return (
    lowered.includes("127.0.0.1") ||
    lowered.includes("localhost") ||
    lowered.includes("0.0.0.0") ||
    lowered.includes("dummy") ||
    lowered.includes("guard")
  );
}

/** Efeito colateral imediato na importação: blindagem antes de qualquer PrismaClient. */
export function applyDatabaseUrlGuard(): void {
  process.env.DATABASE_URL = DUMMY_DATABASE_URL;
  process.env.DIRECT_URL = DUMMY_DATABASE_URL;
}

// Aplica logo ao carregar o módulo (setupFiles roda antes de qualquer teste).
applyDatabaseUrlGuard();

/**
 * Valida que a DATABASE_URL efetiva não aponta para produção.
 * Fail-closed: lança se não conseguir confirmar que é dummy/local.
 */
export function assertNoProductionDatabaseUrl(): void {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "[prisma-guard] DATABASE_URL não definida. Fail-closed: recusa-se a rodar sem URL de banco de teste conhecida.",
    );
  }
  if (looksLikeProductionUrl(url)) {
    throw new Error(
      `[prisma-guard] DATABASE_URL aponta para produção (${url}). Fail-closed: testes não podem usar banco de produção.`,
    );
  }
  if (!isDummyOrLocal(url)) {
    throw new Error(
      `[prisma-guard] DATABASE_URL não é dummy/local reconhecida (${url}). Fail-closed: recusa-se a rodar.`,
    );
  }
}
