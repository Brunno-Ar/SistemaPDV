import {
  montarRespostaFatura,
  respostaGenerica,
  type CasoFatura,
} from "@/lib/billing-pending";

describe("billing/pending - resposta genérica (anti-enumeração)", () => {
  const ausencias: CasoFatura[] = [
    { caso: "sem-usuario" },
    { caso: "sem-assinatura" },
    { caso: "sem-fatura" },
    { caso: "erro-asaas" },
  ];

  it("todos os casos de ausência devolvem corpo e status idênticos", () => {
    const respostas = ausencias.map((c) => montarRespostaFatura(c));

    for (const r of respostas) {
      expect(r.status).toBe(200);
      expect(r.body).toEqual({ billing: null });
    }

    // Equivalência byte a byte: nada distingue uma conta da outra.
    const serializados = respostas.map((r) => JSON.stringify(r));
    expect(new Set(serializados).size).toBe(1);
  });

  it("respostaGenerica é o mesmo objeto lógico dos casos de ausência", () => {
    const generica = respostaGenerica();
    expect(generica).toEqual(montarRespostaFatura({ caso: "sem-usuario" }));
    expect(generica).toEqual(montarRespostaFatura({ caso: "erro-asaas" }));
  });

  it("caso com fatura devolve billing preenchido (não genérico)", () => {
    const r = montarRespostaFatura({
      caso: "fatura",
      value: 49.9,
      invoiceUrl: "https://asaas/inv/1",
      status: "OVERDUE",
      dueDate: "2026-11-01T00:00:00.000Z",
    });

    expect(r.status).toBe(200);
    expect(r.body).toEqual({
      billing: {
        value: 49.9,
        invoiceUrl: "https://asaas/inv/1",
        status: "OVERDUE",
        vencimento: new Date("2026-11-01T00:00:00.000Z").toLocaleDateString(
          "pt-BR",
        ),
      },
    });
  });

  it("dueDate inválido não vaza 'Invalid Date'", () => {
    const r = montarRespostaFatura({
      caso: "fatura",
      value: 10,
      invoiceUrl: null,
      status: "PENDING",
      dueDate: "nao-e-data",
    });
    expect(r.body).toEqual({
      billing: { value: 10, invoiceUrl: null, status: "PENDING", vencimento: "" },
    });
  });
});
