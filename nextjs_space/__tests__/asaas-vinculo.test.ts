/**
 * @jest-environment node
 *
 * Regras puras do vinculo Asaas (`lib/asaas-vinculo.ts`): classificacao de
 * assinaturas, proposta de criacao sem fallback silencioso e token de preview.
 */
import {
  classificarAssinaturas,
  gerarTokenPreview,
  jsonEstavel,
  mascararDocumento,
  mascararEmail,
  montarProposta,
  verificarTokenPreview,
  versaoSnapshot,
} from "@/lib/asaas-vinculo";

const HOJE = new Date("2026-11-15T12:00:00.000Z");
const SEGREDO = "segredo-de-teste";

describe("classificarAssinaturas", () => {
  it("0 assinatura: nenhuma (pode criar, com aviso no preview)", () => {
    expect(classificarAssinaturas([]).tipo).toBe("nenhuma");
    expect(classificarAssinaturas(null).tipo).toBe("nenhuma");
  });

  it("1 assinatura ACTIVE: unica, reusa sem duplicar", () => {
    const r = classificarAssinaturas([
      { id: "sub_1", status: "ACTIVE", value: 49.9, cycle: "MONTHLY" },
    ]);
    expect(r.tipo).toBe("unica");
    if (r.tipo === "unica") expect(r.candidata.id).toBe("sub_1");
  });

  it("1 assinatura inativa/cancelada: conflito (nunca criar por cima)", () => {
    for (const status of ["INACTIVE", "CANCELLED", "EXPIRED"]) {
      const r = classificarAssinaturas([{ id: "sub_1", status }]);
      expect(r.tipo).toBe("conflito");
      if (r.tipo === "conflito") expect(r.motivo).toBe("inativa_unica");
    }
  });

  it("2+ assinaturas: conflito por multipla, sem escolher sozinho", () => {
    const r = classificarAssinaturas([
      { id: "sub_1", status: "ACTIVE" },
      { id: "sub_2", status: "ACTIVE" },
    ]);
    expect(r.tipo).toBe("conflito");
    if (r.tipo === "conflito") {
      expect(r.motivo).toBe("multipla");
      expect(r.total).toBe(2);
      expect(r.candidatos).toHaveLength(2);
    }
  });
});

describe("montarProposta", () => {
  it("aceita valor/ciclo/vencimento inequivocos", () => {
    const r = montarProposta({
      valor: 49.9,
      ciclo: "MONTHLY",
      primeiroVencimento: "2026-11-29",
      hoje: HOJE,
    });
    expect(r.ok).toBe(true);
  });

  it("recusa valor ausente/invalido sem inventar preco", () => {
    expect(
      montarProposta({ ciclo: "MONTHLY", primeiroVencimento: "2026-11-29" }).ok,
    ).toBe(false);
    expect(
      montarProposta({ valor: 0, ciclo: "MONTHLY", primeiroVencimento: "2026-11-29" })
        .ok,
    ).toBe(false);
  });

  it("recusa ciclo nao suportado (nao converte ANUAL em mensal)", () => {
    const r = montarProposta({
      valor: 49.9,
      ciclo: "YEARLY",
      primeiroVencimento: "2026-11-29",
      hoje: HOJE,
    });
    expect(r.ok).toBe(false);
  });

  it("aceita nextDueDate exatamente para hoje", () => {
    const r = montarProposta({
      valor: 49.9,
      ciclo: "MONTHLY",
      primeiroVencimento: "2026-11-15",
      hoje: HOJE,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.proposta.primeiroVencimento).toBe("2026-11-15");
    }
  });

  it("recusa nextDueDate retroativo", () => {
    const r = montarProposta({
      valor: 49.9,
      ciclo: "MONTHLY",
      primeiroVencimento: "2026-11-14",
      hoje: HOJE,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.motivo).toBe("primeiro vencimento retroativo");
    }
  });

  it("recusa formato de data invalido ou inexistente no calendario", () => {
    expect(
      montarProposta({
        valor: 49.9,
        ciclo: "MONTHLY",
        primeiroVencimento: "2026-02-31",
        hoje: HOJE,
      }).ok,
    ).toBe(false);
    expect(
      montarProposta({
        valor: 49.9,
        ciclo: "MONTHLY",
        primeiroVencimento: "invalid-date",
        hoje: HOJE,
      }).ok,
    ).toBe(false);
  });
});

describe("token de preview", () => {
  const payload = {
    empresaId: "E1",
    modo: "provisionamento",
    versao: "abc123",
    exp: HOJE.getTime() + 60_000,
  };

  it("aceita token integro e vigente", () => {
    const token = gerarTokenPreview(payload, SEGREDO);
    const r = verificarTokenPreview(token, {
      segredo: SEGREDO,
      empresaId: "E1",
      modo: "provisionamento",
      versao: "abc123",
      agora: HOJE,
    });
    expect(r.ok).toBe(true);
  });

  it("recusa token expirado", () => {
    const token = gerarTokenPreview(payload, SEGREDO);
    const r = verificarTokenPreview(token, {
      segredo: SEGREDO,
      empresaId: "E1",
      modo: "provisionamento",
      versao: "abc123",
      agora: new Date(HOJE.getTime() + 120_000),
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.motivo).toBe("expirado");
  });

  it("recusa token adulterado", () => {
    const token = gerarTokenPreview(payload, SEGREDO);
    const r = verificarTokenPreview(`${token}troca`, {
      segredo: SEGREDO,
      empresaId: "E1",
      modo: "provisionamento",
      versao: "abc123",
      agora: HOJE,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.motivo).toBe("assinatura");
  });

  it("recusa token de outro estado (preview obsoleto)", () => {
    const token = gerarTokenPreview(payload, SEGREDO);
    const r = verificarTokenPreview(token, {
      segredo: SEGREDO,
      empresaId: "E1",
      modo: "provisionamento",
      versao: "estado-novo",
      agora: HOJE,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.motivo).toBe("divergente");
  });

  it("recusa token vazio ou malformado", () => {
    expect(
      verificarTokenPreview(null, {
        segredo: SEGREDO,
        empresaId: "E1",
        modo: "vinculada",
        versao: "v",
        agora: HOJE,
      }).ok,
    ).toBe(false);
    expect(
      verificarTokenPreview("sem-ponto", {
        segredo: SEGREDO,
        empresaId: "E1",
        modo: "vinculada",
        versao: "v",
        agora: HOJE,
      }).ok,
    ).toBe(false);
  });
});

describe("snapshot e mascaras", () => {
  it("versao muda quando o estado muda e ignora ordem de chaves", () => {
    const a = versaoSnapshot({ x: 1, y: { b: 2, a: 3 } });
    const b = versaoSnapshot({ y: { a: 3, b: 2 }, x: 1 });
    const c = versaoSnapshot({ x: 1, y: { b: 2, a: 4 } });
    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(jsonEstavel({ a: undefined, b: 1 })).toBe('{"b":1}');
  });

  it("mascara documento e email (sem PII na resposta)", () => {
    expect(mascararDocumento("12.345.678/0001-99")).toBe("***0199");
    expect(mascararDocumento(null)).toBeNull();
    expect(mascararEmail("bruno@exemplo.com")).toBe("br***@exemplo.com");
    expect(mascararEmail("nao-e-email")).toBeNull();
  });
});
