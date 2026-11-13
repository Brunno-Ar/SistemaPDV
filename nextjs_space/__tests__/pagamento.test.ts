import {
  avaliarPagamento,
  decidirCreditoPagamento,
  eventoCreditaPlano,
  EVENTO_PAGAMENTO_RECEBIDO,
  PRECO_PLANO_PADRAO,
  VALOR_MINIMO_PAGAMENTO,
  houveConfirmacaoPagamento,
  estadoLocalConfirmaPagamento,
  conferirPagamentoConfirmado,
  calcularVencimentoCobertura,
  avancarVencimentoSeMaior,
} from "@/lib/pagamento";
import { precoComDesconto } from "@/lib/fidelidade";

const empresa = {
  asaasCustomerId: "cus_1",
  asaasSubscriptionId: "sub_1",
};

const pago = (over: Record<string, unknown> = {}) => ({
  id: "pay_1",
  customer: "cus_1",
  subscription: "sub_1",
  value: PRECO_PLANO_PADRAO,
  dueDate: "2026-11-10",
  ...over,
});

describe("avaliarPagamento (validacao de integridade)", () => {
  it("aceita pagamento integro", () => {
    expect(avaliarPagamento(pago(), empresa)).toEqual({ processar: true });
  });

  it("recusa payload sem payment.id", () => {
    expect(avaliarPagamento(pago({ id: null }), empresa).processar).toBe(false);
  });

  it("recusa customer de outra empresa", () => {
    expect(
      avaliarPagamento(pago({ customer: "cus_OUTRO" }), empresa),
    ).toMatchObject({ processar: false });
  });

  it("recusa subscription de outra empresa", () => {
    expect(
      avaliarPagamento(pago({ subscription: "sub_OUTRO" }), empresa),
    ).toMatchObject({ processar: false });
  });

  it("aceita quando a empresa nao tem assinatura conhecida", () => {
    expect(
      avaliarPagamento(pago({ subscription: "sub_X" }), {
        ...empresa,
        asaasSubscriptionId: null,
      }),
    ).toEqual({ processar: true });
  });

  it("recusa valor invalido (0, negativo, NaN, string)", () => {
    for (const value of [0, -10, NaN, "49.90"]) {
      expect(avaliarPagamento(pago({ value }), empresa).processar).toBe(false);
    }
  });

  it("aceita valor ACIMA da tabela (juros/multa de pagamento atrasado)", () => {
    expect(
      avaliarPagamento(pago({ value: PRECO_PLANO_PADRAO + 5 }), empresa),
    ).toEqual({ processar: true });
  });

  it("aceita 50% de fidelidade (R$24,95)", () => {
    expect(
      avaliarPagamento(
        pago({ value: precoComDesconto(PRECO_PLANO_PADRAO, 50) }),
        empresa,
      ),
    ).toEqual({ processar: true });
  });

  it("recusa SUBPAGAMENTO (R$0,01 e um centavo abaixo do piso)", () => {
    expect(VALOR_MINIMO_PAGAMENTO).toBe(24.95);
    for (const value of [0.01, 1, 24.94]) {
      const r = avaliarPagamento(pago({ value }), empresa);
      expect(r.processar).toBe(false);
      expect(r).toMatchObject({ motivo: expect.stringContaining("abaixo do devido") });
    }
  });

  it("recusa payload sem dueDate valido (nao inventa cobertura)", () => {
    for (const dueDate of [null, undefined, "", "data-invalida"]) {
      expect(
        avaliarPagamento(pago({ dueDate }), empresa).processar,
      ).toBe(false);
    }
  });
});

describe("dedupe de pagamento SEM coluna nova (fora de ordem)", () => {
  it("pay_1, pay_2 e retry de pay_1: nao estende duas vezes", () => {
    const alvo1 = calcularVencimentoCobertura("2026-11-10")!;
    const alvo2 = calcularVencimentoCobertura("2026-12-10")!;

    let venc = avancarVencimentoSeMaior(null, alvo1);
    expect(venc).toEqual(alvo1);

    venc = avancarVencimentoSeMaior(venc, alvo2);
    expect(venc).toEqual(alvo2);

    // retry de pay_1 (outro event id, mesmo payment antigo) => no-op
    expect(avancarVencimentoSeMaior(venc, alvo1)).toBeNull();
  });

  it("pay_2 antes de pay_1: alvo antigo nao retrocede nem credita de novo", () => {
    const alvo1 = calcularVencimentoCobertura("2026-11-10")!;
    const alvo2 = calcularVencimentoCobertura("2026-12-10")!;

    const venc = avancarVencimentoSeMaior(null, alvo2);
    expect(venc).toEqual(alvo2);
    expect(avancarVencimentoSeMaior(venc, alvo1)).toBeNull();
  });
});

describe("gate de evento: so PAYMENT_RECEIVED credita plano/referral", () => {
  it("eventoCreditaPlano: RECEIVED sim; CONFIRMED e outros nao", () => {
    expect(eventoCreditaPlano(EVENTO_PAGAMENTO_RECEBIDO)).toBe(true);
    expect(eventoCreditaPlano("PAYMENT_CONFIRMED")).toBe(false);
    expect(eventoCreditaPlano("PAYMENT_OVERDUE")).toBe(false);
    expect(eventoCreditaPlano(null)).toBe(false);
  });

  it("PAYMENT_CONFIRMED sozinho: nao credita (mesmo com valor valido)", () => {
    expect(
      decidirCreditoPagamento("PAYMENT_CONFIRMED", pago(), empresa),
    ).toMatchObject({ processar: false });
  });

  it("RECEIVED credita; RECEIVED fora de ordem tambem (idempotencia e por cobertura)", () => {
    expect(
      decidirCreditoPagamento(EVENTO_PAGAMENTO_RECEBIDO, pago(), empresa),
    ).toEqual({ processar: true });
  });
});

describe("cobertura de vencimento (idempotencia sem coluna de payment.id)", () => {
  it("dueDate valido: um ciclo depois", () => {
    expect(
      calcularVencimentoCobertura("2026-11-10")?.toISOString().slice(0, 10),
    ).toBe("2026-12-10");
  });

  it("dueDate ausente/invalido: fail-closed (null)", () => {
    expect(calcularVencimentoCobertura(null)).toBeNull();
    expect(calcularVencimentoCobertura("data-invalida")).toBeNull();
  });

  it("preserva fim de mes (31/01 + 1 mes -> 28/02)", () => {
    expect(
      calcularVencimentoCobertura("2026-01-31")?.toISOString().slice(0, 10),
    ).toBe("2026-02-28");
  });

  it("replay do MESMO pagamento nao avanca duas vezes", () => {
    const alvo = calcularVencimentoCobertura("2026-11-10")!;
    expect(avancarVencimentoSeMaior(null, alvo)).toEqual(alvo);
    // segunda passada com o mesmo alvo => no-op
    expect(avancarVencimentoSeMaior(alvo, alvo)).toBeNull();
    // reentrega fora de ordem (alvo anterior) => no-op
    const anterior = calcularVencimentoCobertura("2026-10-10")!;
    expect(avancarVencimentoSeMaior(alvo, anterior)).toBeNull();
    // pagamento novo => avanca
    const proximo = calcularVencimentoCobertura("2026-12-10")!;
    expect(avancarVencimentoSeMaior(alvo, proximo)).toEqual(proximo);
  });
});

describe("preco: fonte unica", () => {
  it("base exata R$49,90 e 50% = R$24,95", () => {
    expect(PRECO_PLANO_PADRAO).toBe(49.9);
    expect(precoComDesconto(PRECO_PLANO_PADRAO, 50)).toBe(24.95);
  });
});

describe("confirmacao de pagamento (reativacao manual master)", () => {
  const AGORA = new Date("2026-11-12T12:00:00.000Z");
  const dias = (d: number) =>
    new Date(AGORA.getTime() + d * 24 * 60 * 60 * 1000);

  describe("houveConfirmacaoPagamento (vinculo + cobertura)", () => {
    const vencendo = AGORA.toISOString().slice(0, 10);
    const recebido = (extra: Record<string, unknown> = {}) => ({
      status: "RECEIVED",
      value: PRECO_PLANO_PADRAO,
      dueDate: vencendo,
      customer: "cus_1",
      subscription: "sub_1",
      ...extra,
    });

    it("so RECEIVED libera reativacao manual; CONFIRMED e outros nao", () => {
      expect(houveConfirmacaoPagamento([recebido()])).toBe(true);
      expect(houveConfirmacaoPagamento([recebido({ status: "received" })])).toBe(
        true,
      );
      expect(
        houveConfirmacaoPagamento([recebido({ status: "CONFIRMED" })]),
      ).toBe(false);
      expect(houveConfirmacaoPagamento([])).toBe(false);
      expect(houveConfirmacaoPagamento([recebido({ status: "PENDING" })])).toBe(
        false,
      );
      expect(houveConfirmacaoPagamento([recebido({ status: "OVERDUE" })])).toBe(
        false,
      );
      expect(houveConfirmacaoPagamento([recebido({ status: "REFUNDED" })])).toBe(
        false,
      );
    });

    it("aceita desconto e valor acima (juros/multa); recusa invalido", () => {
      expect(
        houveConfirmacaoPagamento([recebido({ value: PRECO_PLANO_PADRAO / 2 })]),
      ).toBe(true);
      expect(
        houveConfirmacaoPagamento([recebido({ value: PRECO_PLANO_PADRAO + 5 })]),
      ).toBe(true);
      expect(houveConfirmacaoPagamento([recebido({ value: 0 })])).toBe(false);
      expect(houveConfirmacaoPagamento([recebido({ value: null })])).toBe(false);
    });

    it("recusa SUBPAGAMENTO que cobre o ciclo (R$0,01 / abaixo do piso)", () => {
      for (const value of [0.01, 1, 24.94]) {
        expect(houveConfirmacaoPagamento([recebido({ value })])).toBe(false);
      }
      expect(
        houveConfirmacaoPagamento([recebido({ value: 24.95 })]),
      ).toBe(true);
    });

    it("recusa RECEBIMENTO ANTIGO (nao reativa divida posterior)", () => {
      const antigo = new Date(AGORA);
      antigo.setMonth(antigo.getMonth() - 3);
      expect(
        houveConfirmacaoPagamento([
          recebido({ dueDate: antigo.toISOString().slice(0, 10) }),
        ]),
      ).toBe(false);

      const passado = new Date(AGORA);
      passado.setMonth(passado.getMonth() - 1);
      passado.setDate(passado.getDate() - 2);
      expect(
        houveConfirmacaoPagamento([
          recebido({ dueDate: passado.toISOString().slice(0, 10) }),
        ]),
      ).toBe(false);
    });

    it("exige cobertura: dueDate ausente/invalido nao prova nada", () => {
      expect(houveConfirmacaoPagamento([recebido({ dueDate: null })])).toBe(
        false,
      );
      expect(
        houveConfirmacaoPagamento([recebido({ dueDate: "data-invalida" })]),
      ).toBe(false);
    });

    it("exige vinculo com a MESMA subscription/customer", () => {
      const ctx = { customerId: "cus_1", subscriptionId: "sub_1", agora: AGORA };
      expect(houveConfirmacaoPagamento([recebido()], ctx)).toBe(true);
      expect(
        houveConfirmacaoPagamento(
          [recebido({ subscription: "sub_OUTRA" })],
          ctx,
        ),
      ).toBe(false);
      expect(
        houveConfirmacaoPagamento([recebido({ customer: "cus_OUTRO" })], ctx),
      ).toBe(false);
      expect(
        houveConfirmacaoPagamento([recebido({ subscription: null })], ctx),
      ).toBe(false);
      expect(
        houveConfirmacaoPagamento([recebido({ customer: null })], ctx),
      ).toBe(false);
    });

    it("so CONFIRMED no historico: recusa (nao liquida)", () => {
      expect(
        houveConfirmacaoPagamento([recebido({ status: "CONFIRMED" })], {
          customerId: "cus_1",
          subscriptionId: "sub_1",
          agora: AGORA,
        }),
      ).toBe(false);
    });
  });

  describe("estadoLocalConfirmaPagamento", () => {
    it("confirma com cobertura futura fora de trial/pendente", () => {
      expect(
        estadoLocalConfirmaPagamento(
          { status: "ATIVO", vencimentoPlano: dias(20) },
          AGORA,
        ),
      ).toBe(true);
    });

    it("recusa sem vencimento, cobertura vencida, trial ou pendente", () => {
      expect(
        estadoLocalConfirmaPagamento(
          { status: "ATIVO", vencimentoPlano: null },
          AGORA,
        ),
      ).toBe(false);
      expect(
        estadoLocalConfirmaPagamento(
          { status: "ATIVO", vencimentoPlano: dias(-1) },
          AGORA,
        ),
      ).toBe(false);
      expect(
        estadoLocalConfirmaPagamento(
          { status: "EM_TESTE", vencimentoPlano: dias(20) },
          AGORA,
        ),
      ).toBe(false);
      expect(
        estadoLocalConfirmaPagamento(
          { status: "PENDENTE", vencimentoPlano: dias(20) },
          AGORA,
        ),
      ).toBe(false);
    });
  });

  describe("conferirPagamentoConfirmado", () => {
    const semLocal = {
      asaasCustomerId: "cus_1",
      asaasSubscriptionId: "sub_1",
      vencimentoPlano: null,
    };
    const liquidado = {
      status: "RECEIVED",
      value: PRECO_PLANO_PADRAO,
      dueDate: AGORA.toISOString().slice(0, 10),
      customer: "cus_1",
      subscription: "sub_1",
    };

    it("historico vazio: recusa (fail-closed, nunca libera)", async () => {
      const r = await conferirPagamentoConfirmado(
        semLocal,
        async () => [],
        AGORA,
      );
      expect(r).toEqual({
        confirmado: false,
        fonte: "nenhuma",
        pendente: false,
      });
    });

    it("historico com RECEIVED vinculado: confirma pela fonte asaas", async () => {
      const r = await conferirPagamentoConfirmado(
        semLocal,
        async () => [liquidado],
        AGORA,
      );
      expect(r).toEqual({
        confirmado: true,
        fonte: "asaas",
        pendente: false,
      });
    });

    it("historico so com CONFIRMED: recusa (fail-closed)", async () => {
      const r = await conferirPagamentoConfirmado(
        semLocal,
        async () => [{ ...liquidado, status: "CONFIRMED" }],
        AGORA,
      );
      expect(r).toEqual({
        confirmado: false,
        fonte: "nenhuma",
        pendente: false,
      });
    });

    it("historico com RECEIVED de subpagamento: recusa (fail-closed)", async () => {
      const r = await conferirPagamentoConfirmado(
        semLocal,
        async () => [{ ...liquidado, value: 0.01 }],
        AGORA,
      );
      expect(r).toEqual({
        confirmado: false,
        fonte: "nenhuma",
        pendente: false,
      });
    });

    it("historico com RECEIVED antigo (cobertura vencida): recusa", async () => {
      const antigo = new Date(AGORA);
      antigo.setMonth(antigo.getMonth() - 3);
      const r = await conferirPagamentoConfirmado(
        semLocal,
        async () => [
          { ...liquidado, dueDate: antigo.toISOString().slice(0, 10) },
        ],
        AGORA,
      );
      expect(r).toEqual({
        confirmado: false,
        fonte: "nenhuma",
        pendente: false,
      });
    });

    it("falha do Asaas (excecao) vira pendente true (nunca libera)", async () => {
      const r = await conferirPagamentoConfirmado(
        semLocal,
        async () => {
          throw new Error("Asaas fora do ar");
        },
        AGORA,
      );
      expect(r).toEqual({
        confirmado: false,
        fonte: "nenhuma",
        pendente: true,
      });
    });

    it("historico indisponivel (null) vira pendente true (nunca libera)", async () => {
      const r = await conferirPagamentoConfirmado(
        semLocal,
        async () => null,
        AGORA,
      );
      expect(r).toEqual({
        confirmado: false,
        fonte: "nenhuma",
        pendente: true,
      });
    });
  });
});
