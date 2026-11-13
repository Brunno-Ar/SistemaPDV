import {
  applyDatabaseUrlGuard,
  assertNoProductionDatabaseUrl,
} from "../lib/prisma-guard";

describe("prisma-guard (fail-closed contra banco de produção)", () => {
  const originalDbUrl = process.env.DATABASE_URL;
  const originalDirectUrl = process.env.DIRECT_URL;

  afterEach(() => {
    process.env.DATABASE_URL = originalDbUrl;
    process.env.DIRECT_URL = originalDirectUrl;
  });

  it("aplica URL dummy/local inalcançável ao ser importado", () => {
    applyDatabaseUrlGuard();
    expect(process.env.DATABASE_URL).toContain("127.0.0.1");
    expect(process.env.DATABASE_URL).toContain("dummy");
    expect(process.env.DATABASE_URL).not.toContain("supabase");
    expect(process.env.DIRECT_URL).toContain("127.0.0.1");
  });

  it("não lança com URL dummy/local", () => {
    process.env.DATABASE_URL = "postgresql://x:y@127.0.0.1:1/db_teste";
    expect(() => assertNoProductionDatabaseUrl()).not.toThrow();
  });

  it("lança com URL de produção (Supabase)", () => {
    process.env.DATABASE_URL =
      "postgresql://user:pass@db.projeto.supabase.co:5432/postgres";
    expect(() => assertNoProductionDatabaseUrl()).toThrow(/produção/);
  });

  it("lança quando DATABASE_URL está ausente (fail-closed)", () => {
    const atual = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;
    expect(() => assertNoProductionDatabaseUrl()).toThrow(/não definida/);
    process.env.DATABASE_URL = atual;
  });
});
