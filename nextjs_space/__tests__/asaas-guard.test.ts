/**
 * Testa o guard fail-closed de chamadas Asaas LIVE fora de producao.
 *
 * Regras:
 * - Producao (VERCEL_ENV=production) + URL live: libera (fetch executado).
 * - Preview/development + URL live: lança erro ANTES de qualquer fetch.
 * - Sandbox (URL com sandbox): libera em qualquer ambiente.
 * - Testes de unidade (NODE_ENV=test sem VERCEL_ENV): libera (ambiente controlado).
 *
 * Todo fluxo usa fetch mockado; nenhuma chamada de rede real, sem Asaas/env/Vercel.
 */

const ORIGINAL_ENV = { ...process.env };
const ORIGINAL_FETCH = globalThis.fetch;

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  globalThis.fetch = ORIGINAL_FETCH;
  jest.resetModules();
});

function setEnv(overrides: Record<string, string | undefined>) {
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

async function importAsaas(): Promise<typeof import("@/lib/asaas")> {
  jest.resetModules();
  return await import("@/lib/asaas");
}

describe("Guard Asaas live fora de producao", () => {
  it("preview + URL live lança erro antes de qualquer fetch", async () => {
    setEnv({
      VERCEL_ENV: "preview",
      NODE_ENV: "development",
      ASAAS_API_URL: "https://api.asaas.com/v3",
      ASAAS_API_KEY: "live_key",
    });

    let fetchCalled = false;
    globalThis.fetch = async () => {
      fetchCalled = true;
      throw new Error("não deve ser chamado");
    };

    const mod = await importAsaas();
    expect(() => mod.assertAsaasNotLiveOutsideProduction()).toThrow(
      /bloqueadas fora de producao/,
    );
    await expect(mod.asaas.getCustomer("cus_test")).rejects.toThrow(
      /bloqueadas fora de producao/,
    );
    expect(fetchCalled).toBe(false);
  });

  it("producao + URL live passa e executa fetch", async () => {
    setEnv({
      VERCEL_ENV: "production",
      NODE_ENV: "production",
      ASAAS_API_URL: "https://api.asaas.com/v3",
      ASAAS_API_KEY: "live_key",
    });

    let fetchUrl: string | null = null;
    (globalThis.fetch as any) = async (input: RequestInfo | URL) => {
      fetchUrl = String(input);
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ data: [{ id: "cus_1" }] }),
      };
    };

    const { asaas } = await importAsaas();
    await asaas.getCustomer("cus_1");

    expect(fetchUrl).toContain("api.asaas.com");
  });

  it("sandbox permanece utilizavel em preview/dev", async () => {
    setEnv({
      VERCEL_ENV: "preview",
      NODE_ENV: "development",
      ASAAS_API_URL: "https://sandbox.asaas.com/v3",
      ASAAS_API_KEY: "sandbox_key",
    });

    let fetchUrl: string | null = null;
    (globalThis.fetch as any) = async (input: RequestInfo | URL) => {
      fetchUrl = String(input);
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ data: [{ id: "cus_1" }] }),
      };
    };

    const { asaas } = await importAsaas();
    await asaas.getCustomer("cus_1");

    expect(fetchUrl).toContain("sandbox.asaas.com");
  });

  it("teste de unidade sem VERCEL_ENV libera (ambiente controlado)", async () => {
    setEnv({
      VERCEL_ENV: undefined,
      NODE_ENV: "test",
      ASAAS_API_URL: "https://api.asaas.com/v3",
      ASAAS_API_KEY: "live_key",
    });

    let fetchCalled = false;
    (globalThis.fetch as any) = async () => {
      fetchCalled = true;
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ data: [{ id: "cus_1" }] }),
      };
    };

    const { asaas } = await importAsaas();
    await asaas.getCustomer("cus_1");

    expect(fetchCalled).toBe(true);
  });
});
