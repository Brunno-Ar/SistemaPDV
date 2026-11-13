/**
 * Cobre a persistencia TRANSACIONAL da recompensa MGM
 * (`aplicarRecompensaIndicacao`) sem Prisma/Asaas reais e SEM colunas novas.
 *
 * O `tx` e um fake em memoria e `runTx` simula commit/rollback: se a callback
 * lanca, o estado e restaurado (como o rollback do Postgres). Assim validamos:
 *  - pagamento confirmado e recompensa sao atomicos (falha parcial nao deixa
 *    credito faltando nem pagamento marcado);
 *  - retry/duplicado nao duplica credito (idempotencia por transicao TRIAL->PAGO
 *    e por `mesGratisGerado`);
 *  - o direito do marco 3 fica no `vencimentoPlano` do indicador (ledger duravel
 *    que substitui a coluna `mesesGratisCredito`).
 */

import { aplicarRecompensaIndicacao, adicionarMeses } from "@/lib/fidelidade";

interface Conversao {
  id: string;
  novaEmpresaId: string;
  linkId: string;
  status: string;
  mesGratisGerado: boolean;
}
interface Link {
  id: string;
  empresaId: string;
}
interface Empresa {
  id: string;
  vencimentoPlano: Date | null;
}
interface Estado {
  conversions: Conversao[];
  links: Link[];
  empresas: Empresa[];
}

const NOVA = "E_NOVA";
const AGORA = new Date("2026-06-01T00:00:00.000Z");

function estado(
  pagas: number,
  opts: { statusNova?: string; vencimentoIndicador?: Date | null } = {},
): Estado {
  const conversions: Conversao[] = [
    {
      id: "C_NOVA",
      novaEmpresaId: NOVA,
      linkId: "L1",
      status: opts.statusNova ?? "TRIAL",
      mesGratisGerado: false,
    },
  ];
  for (let i = 0; i < pagas; i++) {
    conversions.push({
      id: `C${i}`,
      novaEmpresaId: `E_PAGA_${i}`,
      linkId: "L1",
      status: "PAGO",
      mesGratisGerado: false,
    });
  }
  return {
    conversions,
    links: [{ id: "L1", empresaId: "E1" }],
    empresas: [
      {
        id: "E1",
        vencimentoPlano:
          opts.vencimentoIndicador === undefined
            ? new Date("2026-06-10T00:00:00.000Z")
            : opts.vencimentoIndicador,
      },
      { id: NOVA, vencimentoPlano: null },
    ],
  };
}

function fakeTx(estado: Estado, hooks: { falharEmpresaUpdate?: boolean } = {}) {
  return {
    $queryRaw: async () => [],
    memberConversion: {
      findUnique: async ({ where }: any) =>
        estado.conversions.find(
          (c) => c.novaEmpresaId === where.novaEmpresaId,
        ) ?? null,
      updateMany: async ({ where, data }: any) => {
        const c = estado.conversions.find(
          (x) =>
            x.id === where.id &&
            (where.status === undefined || x.status === where.status) &&
            (where.mesGratisGerado === undefined ||
              x.mesGratisGerado === where.mesGratisGerado),
        );
        if (!c) return { count: 0 };
        Object.assign(c, data);
        return { count: 1 };
      },
      count: async ({ where }: any) =>
        estado.conversions.filter(
          (c) =>
            c.linkId === where.linkId &&
            (where.status === undefined || c.status === where.status) &&
            (where.mesGratisGerado === undefined ||
              c.mesGratisGerado === where.mesGratisGerado),
        ).length,
      update: async ({ where, data }: any) => {
        const c = estado.conversions.find((x) => x.id === where.id);
        Object.assign(c!, data);
        return c;
      },
    },
    memberLink: {
      findUnique: async ({ where }: any) =>
        estado.links.find((l) => l.id === where.id) ?? null,
    },
    empresa: {
      findUnique: async ({ where }: any) =>
        estado.empresas.find((x) => x.id === where.id) ?? null,
      updateMany: async ({ where, data }: any) => {
        if (hooks.falharEmpresaUpdate) throw new Error("falha de persistencia");
        const e = estado.empresas.find((x) => x.id === where.id);
        if (!e) return { count: 0 };
        const or = where.OR as Array<Record<string, unknown>> | undefined;
        if (or) {
          const atual = e.vencimentoPlano
            ? new Date(e.vencimentoPlano).getTime()
            : null;
          const casa = or.some((cond) => {
            if ("vencimentoPlano" in cond && cond.vencimentoPlano === null) {
              return atual === null;
            }
            const alvo = cond.vencimentoPlano as Date | undefined;
            return alvo ? new Date(alvo).getTime() === atual : false;
          });
          if (!casa) return { count: 0 };
        }
        Object.assign(e, data);
        return { count: 1 };
      },
    },
  };
}

/** Simula uma transacao Prisma: rollback do estado se a callback lanca. */
async function runTx(
  estado: Estado,
  fn: (tx: any) => Promise<any>,
  hooks: { falharEmpresaUpdate?: boolean } = {},
) {
  const snapshot = JSON.parse(JSON.stringify(estado)) as Estado;
  try {
    return await fn(fakeTx(estado, hooks));
  } catch (e) {
    estado.conversions = snapshot.conversions;
    estado.links = snapshot.links;
    estado.empresas = snapshot.empresas;
    throw e;
  }
}

describe("aplicarRecompensaIndicacao (transacional, sem coluna nova)", () => {
  it("3a conversao paga concede 1 mes gratis (vencimento +1 mes)", async () => {
    const e = estado(2); // + C_NOVA = 3 pagas
    const r = await runTx(e, (tx) => aplicarRecompensaIndicacao(tx, NOVA, AGORA));

    expect(r.marco3Novo).toBe(true);
    expect(r.indicadorId).toBe("E1");
    expect(r.descontoPercentual).toBe(0);
    expect(r.vencimentoIndicador).toEqual(
      adicionarMeses(new Date("2026-06-10T00:00:00.000Z"), 1),
    );
    expect(e.empresas.find((x) => x.id === "E1")!.vencimentoPlano).toEqual(
      adicionarMeses(new Date("2026-06-10T00:00:00.000Z"), 1),
    );

    const nova = e.conversions.find((c) => c.id === "C_NOVA")!;
    expect(nova.status).toBe("PAGO");
    expect(nova.mesGratisGerado).toBe(true);
  });

  it("sem cobertura futura do indicador, parte de agora", async () => {
    const e = estado(2, { vencimentoIndicador: null });
    const r = await runTx(e, (tx) => aplicarRecompensaIndicacao(tx, NOVA, AGORA));

    expect(r.vencimentoIndicador).toEqual(adicionarMeses(AGORA, 1));
  });

  it("replay do mesmo pagamento nao duplica o credito", async () => {
    const e = estado(2);
    await runTx(e, (tx) => aplicarRecompensaIndicacao(tx, NOVA, AGORA));
    const vencimentoAposPrimeiro = e.empresas.find((x) => x.id === "E1")!
      .vencimentoPlano;

    const r2 = await runTx(e, (tx) =>
      aplicarRecompensaIndicacao(tx, NOVA, AGORA),
    );

    expect(r2.marco3Novo).toBe(false);
    expect(r2.indicadorId).toBeNull();
    expect(e.empresas.find((x) => x.id === "E1")!.vencimentoPlano).toEqual(
      vencimentoAposPrimeiro,
    );
  });

  it("5a conversao aplica 50% permanente sem mes extra", async () => {
    const e = estado(4); // + C_NOVA = 5 pagas
    const r = await runTx(e, (tx) => aplicarRecompensaIndicacao(tx, NOVA, AGORA));

    expect(r.descontoPercentual).toBe(50);
    // ja havia 1 mes gratis gerado? nao: primeiro evento ja cruza 3 e 5
    expect(r.marco3Novo).toBe(true);
  });

  it("falha parcial na recompensa desfaz tudo (rollback) e o retry aplica 1x", async () => {
    const e = estado(2);
    const antes = e.empresas.find((x) => x.id === "E1")!.vencimentoPlano;

    await expect(
      runTx(e, (tx) => aplicarRecompensaIndicacao(tx, NOVA, AGORA), {
        falharEmpresaUpdate: true,
      }),
    ).rejects.toThrow("falha de persistencia");

    expect(
      new Date(e.empresas.find((x) => x.id === "E1")!.vencimentoPlano as any).toISOString(),
    ).toBe(new Date(antes as Date).toISOString());
    expect(e.conversions.find((c) => c.id === "C_NOVA")!.status).toBe("TRIAL");
    expect(e.conversions.find((c) => c.id === "C_NOVA")!.mesGratisGerado).toBe(
      false,
    );

    const r = await runTx(e, (tx) => aplicarRecompensaIndicacao(tx, NOVA, AGORA));
    expect(r.marco3Novo).toBe(true);
    expect(
      new Date(e.empresas.find((x) => x.id === "E1")!.vencimentoPlano as any).toISOString(),
    ).toBe(adicionarMeses(antes as Date, 1).toISOString());
  });

  it("conversao ja PAGA (fora de ordem) nao credita de novo", async () => {
    const e = estado(2, { statusNova: "PAGO" });
    const r = await runTx(e, (tx) => aplicarRecompensaIndicacao(tx, NOVA, AGORA));

    expect(r.marco3Novo).toBe(false);
    expect(r.indicadorId).toBeNull();
    expect(e.empresas.find((x) => x.id === "E1")!.vencimentoPlano).toEqual(
      new Date("2026-06-10T00:00:00.000Z"),
    );
  });

  it("pagamento sem conversao registrada nao recompensa", async () => {
    const e = estado(2);
    const r = await runTx(e, (tx) =>
      aplicarRecompensaIndicacao(tx, "E_INEXISTENTE", AGORA),
    );
    expect(r.marco3Novo).toBe(false);
    expect(r.indicadorId).toBeNull();
  });

  it("conversoes de outro link nao contam para o marco", async () => {
    const e = estado(0);
    e.conversions.push(
      { id: "X1", novaEmpresaId: "E_X1", linkId: "L2", status: "PAGO", mesGratisGerado: false },
      { id: "X2", novaEmpresaId: "E_X2", linkId: "L2", status: "PAGO", mesGratisGerado: false },
    );
    const r = await runTx(e, (tx) => aplicarRecompensaIndicacao(tx, NOVA, AGORA));
    expect(r.marco3Novo).toBe(false);
  });
});
