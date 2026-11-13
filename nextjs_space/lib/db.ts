import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Guard fail-closed: em ambiente de teste, impede conexão a banco remoto.
 * Apenas host loopback (localhost/127.0.0.1/::1) ou TEST_DATABASE_URL
 * explicitamente local são permitidos. Nunca sobrescreve .env.
 */
function assertDbUrlSafeForTest(): void {
  if (process.env.NODE_ENV !== "test") return;
  const url = process.env.DATABASE_URL || process.env.TEST_DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL/TEST_DATABASE_URL ausente em ambiente de teste; falha fechada.",
    );
  }
  let host: string;
  try {
    host = new URL(url).hostname;
  } catch {
    throw new Error(
      "DATABASE_URL/TEST_DATABASE_URL inválida; falha fechada.",
    );
  }
  const isLocal = host === "localhost" || host === "127.0.0.1" || host === "::1";
  if (!isLocal) {
    throw new Error(
      `Host de banco remoto bloqueado em teste: ${host}; falha fechada.`,
    );
  }
}

assertDbUrlSafeForTest();

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
