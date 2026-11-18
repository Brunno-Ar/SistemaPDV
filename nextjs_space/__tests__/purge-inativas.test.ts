import {
  avaliarElegibilidadeExpurgo,
  calcularDataElegibilidadeExpurgo,
  calcularFimTrial,
  planejarExpurgoInativas,
  ORDEM_EXCLUSAO_FILHOS,
  type ContaCandidata,
  type EvidenciasConta,
  type DepsExpurgo,
} from "@/lib/purge-inativas";

const SEM_USO: EvidenciasConta = {
  vendas: 0,
  itensVenda: 0,
  movimentacoesEstoque: 0,
  movimentacoesCaixa: 0,
  despesas: 0,
  notas: 0,
  produtos: 0,
  lotes: 0,
  cancelamentos: 0,
  indicacoes: 0,
  asaasPendente: false,
  asaasHistoricoPago: false,
  pilotoInterno: false,
};

function conta(over: Partial<ContaCandidata> = {}): ContaCandidata {
  return {
    empresaId: "emp_1",
    nome: "Loja X",
    status: "EM_TESTE",
    vencimentoPlano: new Date("2026-01-15T00:00:00Z"),
    createdAt: new Date("2026-01-01T00:00:00Z"),
    asaasCustomerId: "cus_1",
    asaasSubscriptionId: null,
    ...over,
  };
}

function evid(over: Partial<EvidenciasConta> = {}): EvidenciasConta {
  return { ...SEM_USO, ...over };
}

describe("expurgo: janela de 90 dias apos fim do trial (zero tolerancia)", () => {
  it("fim do trial usa vencimentoPlano (sem tolerancia adicional)", () => {
    const fim = calcularFimTrial(conta());
    expect(fim.toISOString()).toBe("2026-01-15T00:00:00.000Z");
  });

  it("sem vencimentoPlano, deriva de createdAt + TRIAL_DAYS", () => {
    const fim = calcularFimTrial(conta({ vencimentoPlano: null }));
    expect(fim.toISOString()).toBe("2026-01-15T00:00:00.000Z");
  });

  it("data de elegibilidade = fim do trial + 90 dias", () => {
    expect(calcularDataElegibilidadeExpurgo(conta()).toISOString()).toBe(
      "2026-04-15T00:00:00.000Z",
    );
  });

  it("no dia 90 ainda NAO e elegivel; no dia 91 sim", () => {
    const noLimite = avaliarElegibilidadeExpurgo(
      conta(),
      evid(),
      new Date("2026-04-14T23:59:59Z"),
    );
    expect(noLimite.elegivel).toBe(false);
    expect(noLimite.motivos).toContain("menos de 90 dias apos o fim do trial");

    const apos = avaliarElegibilidadeExpurgo(conta(), evid(), new Date("2026-04-16T00:00:00Z"));
    expect(apos.elegivel).toBe(true);
    expect(apos.motivos).toEqual([]);
  });
});

describe("expurgo: preserva qualquer conta com uso ou relacao financeira", () => {
  const agora = new Date("2026-06-01T00:00:00Z");

  it("sem uso e 90 dias vencidos: elegivel", () => {
    expect(avaliarElegibilidadeExpurgo(conta(), evid(), agora).elegivel).toBe(true);
  });

  const preservadores: Array<[string, Partial<EvidenciasConta>, string]> = [
    ["venda", { vendas: 1 }, "venda/item"],
    ["item de venda", { itensVenda: 2 }, "venda/item"],
    ["mov estoque", { movimentacoesEstoque: 1 }, "movimentacao de estoque"],
    ["mov caixa", { movimentacoesCaixa: 1 }, "movimentacao de caixa"],
    ["despesa", { despesas: 1 }, "despesa"],
    ["nota", { notas: 1 }, "nota"],
    ["produto", { produtos: 1 }, "produto/lote"],
    ["lote", { lotes: 1 }, "produto/lote"],
    ["cancelamento", { cancelamentos: 1 }, "cancelamento"],
    ["indicacao", { indicacoes: 1 }, "indicacao/referencia"],
    ["asaas pendente", { asaasPendente: true }, "cobranca/assinatura Asaas pendente"],
    ["historico pago", { asaasHistoricoPago: true }, "historico pago"],
    ["piloto", { pilotoInterno: true }, "piloto/interno"],
  ];

  it.each(preservadores)("%s preserva com motivo '%s'", (_nome, over, motivo) => {
    const r = avaliarElegibilidadeExpurgo(conta(), evid(over), agora);
    expect(r.elegivel).toBe(false);
    expect(r.motivos).toContain(motivo);
  });

  it("conta ATIVO e preservada mesmo sem uso", () => {
    const r = avaliarElegibilidadeExpurgo(conta({ status: "ATIVO" }), evid(), agora);
    expect(r.elegivel).toBe(false);
    expect(r.motivos).toContain("conta ativa");
  });
});

describe("expurgo: rotina dry-run", () => {
  it("separa elegiveis/preservadas e nunca executa", async () => {
    const candidatas = [
      conta({ empresaId: "e_ok", nome: "Inativa" }),
      conta({ empresaId: "e_usada", nome: "Com venda" }),
    ];
    const deps: DepsExpurgo = {
      listarCandidatas: async () => candidatas,
      coletarEvidencias: async (id) =>
        id === "e_usada" ? evid({ vendas: 3 }) : evid(),
    };

    const plano = await planejarExpurgoInativas(
      deps,
      new Date("2026-06-01T00:00:00Z"),
    );

    expect(plano.executado).toBe(false);
    expect(plano.elegiveis.map((i) => i.empresaId)).toEqual(["e_ok"]);
    expect(plano.preservadas.map((i) => i.empresaId)).toEqual(["e_usada"]);
    expect(plano.preservadas[0].motivos).toContain("venda/item");
  });

  it("propaga os ids Asaas para reconciliar apos o commit", async () => {
    const deps: DepsExpurgo = {
      listarCandidatas: async () => [
        conta({ empresaId: "e_ok", asaasCustomerId: "cus_9", asaasSubscriptionId: null }),
      ],
      coletarEvidencias: async () => evid(),
    };

    const plano = await planejarExpurgoInativas(deps, new Date("2026-06-01T00:00:00Z"));
    expect(plano.elegiveis[0].asaasCustomerId).toBe("cus_9");
  });
});

describe("expurgo: ordem de exclusao", () => {
  it("dependencias antes da Empresa, com user por ultimo", () => {
    expect(ORDEM_EXCLUSAO_FILHOS[0]).toBe("saleItem");
    expect(ORDEM_EXCLUSAO_FILHOS.at(-1)).toBe("user");
    expect(ORDEM_EXCLUSAO_FILHOS).not.toContain("empresa");
  });
});
