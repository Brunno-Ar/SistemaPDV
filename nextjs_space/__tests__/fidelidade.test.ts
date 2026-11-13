import {
  calcularRecompensa,
  precoComDesconto,
  adicionarMeses,
  MESES_POR_CREDITO,
  DESCONTO_PERCENTUAL,
  MARCO_DESCONTO,
  MARCO_MES_GRATIS,
  planejarAlinhamentoAssinatura,
  sincronizarBeneficiosAssinatura,
  type EstadoBeneficios,
} from "@/lib/fidelidade";

describe("fidelidade MGM (marcos derivados, sem coluna nova)", () => {
  it("constantes dos marcos", () => {
    expect(MARCO_MES_GRATIS).toBe(3);
    expect(MARCO_DESCONTO).toBe(5);
    expect(DESCONTO_PERCENTUAL).toBe(50);
    expect(MESES_POR_CREDITO).toBe(1);
  });

  it("2 conversoes pagas: nada", () => {
    expect(calcularRecompensa(2, false)).toEqual({
      concederMarco3: false,
      descontoPercentual: 0,
    });
  });

  it("3 conversoes pagas: 1 mes gratis", () => {
    expect(calcularRecompensa(3, false)).toEqual({
      concederMarco3: true,
      descontoPercentual: 0,
    });
  });

  it("4 pagas com mes gratis ja gerado: nada novo", () => {
    expect(calcularRecompensa(4, true)).toEqual({
      concederMarco3: false,
      descontoPercentual: 0,
    });
  });

  it("5 pagas: 50% (e o mes gratis nao se repete se ja gerado)", () => {
    expect(calcularRecompensa(5, true)).toEqual({
      concederMarco3: false,
      descontoPercentual: 50,
    });
  });

  it("sequencia 1..8: mes gratis 1x no marco 3, desconto a partir do 5", () => {
    let mesGerado = false;
    const eventos: string[] = [];

    for (let pagas = 1; pagas <= 8; pagas++) {
      const r = calcularRecompensa(pagas, mesGerado);
      if (r.concederMarco3) {
        mesGerado = true;
        eventos.push("mes-gratis");
      }
      if (r.descontoPercentual === 50 && pagas === MARCO_DESCONTO) {
        eventos.push("desconto-50");
      }
    }

    expect(eventos).toEqual(["mes-gratis", "desconto-50"]);
  });

  it("evento duplicado nao recompensa duas vezes", () => {
    const primeira = calcularRecompensa(3, false);
    const segunda = calcularRecompensa(3, primeira.concederMarco3);
    expect(primeira.concederMarco3).toBe(true);
    expect(segunda.concederMarco3).toBe(false);
  });
});

describe("preco", () => {
  it("precoComDesconto: 50% de 49.90 e clamp", () => {
    expect(precoComDesconto(49.9, 50)).toBe(24.95);
    expect(precoComDesconto(49.9, 0)).toBe(49.9);
    expect(precoComDesconto(49.9, 100)).toBe(0);
    expect(precoComDesconto(49.9, 150)).toBe(0);
    expect(precoComDesconto(49.9, -10)).toBe(49.9);
  });

  it("adicionarMeses preserva fim de mes (31/01 + 1 mes -> 28/02)", () => {
    expect(
      adicionarMeses(new Date("2026-01-31T12:00:00Z"), 1).toISOString(),
    ).toBe("2026-02-28T12:00:00.000Z");
    expect(
      adicionarMeses(new Date("2026-03-15T12:00:00Z"), 1).toISOString(),
    ).toBe("2026-04-15T12:00:00.000Z");
  });
});

describe("alinhamento da assinatura: mes gratis e desconto", () => {
  const estado = (over: Partial<EstadoBeneficios> = {}): EstadoBeneficios => ({
    pagas: 3,
    mesesGratisGerados: 1,
    vencimentoPlano: new Date("2026-07-10T00:00:00.000Z"),
    ...over,
  });

  it("empurra nextDueDate ate o vencimento local (mes gratis)", () => {
    const plano = planejarAlinhamentoAssinatura(
      estado(),
      { nextDueDate: "2026-06-20", value: 49.9 },
      49.9,
    );
    expect(plano).toEqual({
      adiarPara: new Date("2026-07-10T00:00:00.000Z"),
      novoValor: null,
    });
  });

  it("nunca puxa o nextDueDate para tras", () => {
    const plano = planejarAlinhamentoAssinatura(
      estado(),
      { nextDueDate: "2026-08-20", value: 49.9 },
      49.9,
    );
    expect(plano.adiarPara).toBeNull();
  });

  it("com 5 pagas, reduz o valor da assinatura para R$24,95", () => {
    const plano = planejarAlinhamentoAssinatura(
      estado({ pagas: 5 }),
      { nextDueDate: "2026-07-10", value: 49.9 },
      49.9,
    );
    expect(plano).toEqual({ adiarPara: null, novoValor: 24.95 });
  });

  it("valor ja descontado (ou menor): no-op", () => {
    const plano = planejarAlinhamentoAssinatura(
      estado({ pagas: 5 }),
      { nextDueDate: "2026-07-10", value: 24.95 },
      49.9,
    );
    expect(plano.novoValor).toBeNull();
  });

  it("sem assinatura: nada a fazer", () => {
    expect(
      planejarAlinhamentoAssinatura(estado(), null, 49.9),
    ).toEqual({ adiarPara: null, novoValor: null });
  });
});

describe("sincronizarBeneficiosAssinatura (callbacks fake, sem Asaas real)", () => {
  const depsBase = (
    chamadas: { adiar: Date[]; valor: number[] },
    over: Partial<{
      pagas: number;
      mesesGratisGerados: number;
      nextDueDate: string;
      value: number;
      failAdiar: boolean;
      failValor: boolean;
    }> = {},
  ) => {
    const cfg = {
      pagas: 5,
      mesesGratisGerados: 1,
      nextDueDate: "2026-06-20",
      value: 49.9,
      failAdiar: false,
      failValor: false,
      ...over,
    };
    return {
      lerEstado: async () => ({
        pagas: cfg.pagas,
        mesesGratisGerados: cfg.mesesGratisGerados,
        vencimentoPlano: new Date("2026-07-10T00:00:00.000Z"),
      }),
      lerAssinatura: async () => ({
        nextDueDate: cfg.nextDueDate,
        value: cfg.value,
      }),
      adiarAssinatura: async (novo: Date) => {
        if (cfg.failAdiar) throw new Error("Asaas fora do ar");
        chamadas.adiar.push(novo);
      },
      atualizarValor: async (novo: number) => {
        if (cfg.failValor) throw new Error("Asaas fora do ar");
        chamadas.valor.push(novo);
      },
    };
  };

  it("aplica mes gratis e desconto uma unica vez", async () => {
    const chamadas = { adiar: [] as Date[], valor: [] as number[] };
    const r = await sincronizarBeneficiosAssinatura(
      depsBase(chamadas),
      49.9,
    );

    expect(r).toEqual({ adiado: true, valorAtualizado: true, falhas: [] });
    expect(chamadas.adiar).toEqual([new Date("2026-07-10T00:00:00.000Z")]);
    expect(chamadas.valor).toEqual([24.95]);
  });

  it("retry: com o Asaas ja alinhado, nao repete nada", async () => {
    const chamadas = { adiar: [] as Date[], valor: [] as number[] };
    const r = await sincronizarBeneficiosAssinatura(
      depsBase(chamadas, { nextDueDate: "2026-07-10", value: 24.95 }),
      49.9,
    );

    expect(r).toEqual({ adiado: false, valorAtualizado: false, falhas: [] });
    expect(chamadas.adiar).toEqual([]);
    expect(chamadas.valor).toEqual([]);
  });

  it("falha do Asaas e reportada em falhas (permite retry)", async () => {
    const chamadas = { adiar: [] as Date[], valor: [] as number[] };
    const r = await sincronizarBeneficiosAssinatura(
      depsBase(chamadas, { failAdiar: true, failValor: true }),
      49.9,
    );

    expect(r.adiado).toBe(false);
    expect(r.valorAtualizado).toBe(false);
    expect(r.falhas).toHaveLength(2);
  });

  it("empresa sem MGM nao toca na assinatura", async () => {
    const chamadas = { adiar: [] as Date[], valor: [] as number[] };
    const r = await sincronizarBeneficiosAssinatura(
      depsBase(chamadas, { pagas: 1, mesesGratisGerados: 0 }),
      49.9,
    );

    expect(r).toEqual({ adiado: false, valorAtualizado: false, falhas: [] });
    expect(chamadas.adiar).toEqual([]);
    expect(chamadas.valor).toEqual([]);
  });
});
