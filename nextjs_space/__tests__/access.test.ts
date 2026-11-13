import {
  avaliarAcesso,
  motivoParaBloqueio,
  decidirStatusSincronizado,
  podeReativarManualmente,
  TOLERANCIA_PAGAMENTO_DIAS,
  TOLERANCIA_TRIAL_DIAS,
  TRIAL_DIAS_PADRAO,
} from "@/lib/access";

const DIA = 24 * 60 * 60 * 1000;
const AGORA = new Date("2026-11-12T12:00:00.000Z");
const diasAtras = (d: number) => new Date(AGORA.getTime() - d * DIA);
const diasFrente = (d: number) => new Date(AGORA.getTime() + d * DIA);

describe("regras de tolerância", () => {
  it("trial oficial é 14 dias", () => {
    expect(TRIAL_DIAS_PADRAO).toBe(14);
  });

  it("tolerâncias: trial +1 dia, plano +10 dias", () => {
    expect(TOLERANCIA_TRIAL_DIAS).toBe(1);
    expect(TOLERANCIA_PAGAMENTO_DIAS).toBe(10);
  });
});

describe("avaliarAcesso", () => {
  it("libera master mesmo com empresa vencida", () => {
    const r = avaliarAcesso(
      {
        role: "master",
        status: "CANCELADO",
        vencimentoPlano: diasAtras(120),
      },
      AGORA,
    );
    expect(r.permitido).toBe(true);
    expect(r.motivo).toBe("master");
  });

  it("bloqueia trial 1 dia após o vencimento", () => {
    const vigente = avaliarAcesso(
      {
        role: "admin",
        status: "EM_TESTE",
        vencimentoPlano: diasAtras(TOLERANCIA_TRIAL_DIAS),
        temAssinatura: true,
      },
      AGORA,
    );
    expect(vigente.permitido).toBe(true);
    expect(vigente.motivo).toBe("trial-vigente");

    const vencido = avaliarAcesso(
      {
        role: "admin",
        status: "EM_TESTE",
        vencimentoPlano: diasAtras(TOLERANCIA_TRIAL_DIAS + 1),
        temAssinatura: true,
      },
      AGORA,
    );
    expect(vencido.permitido).toBe(false);
    expect(vencido.motivo).toBe("trial-vencido");
  });

  it("bloqueia cobrança vencida depois de 10 dias e não antes", () => {
    const noLimite = avaliarAcesso(
      {
        role: "admin",
        status: "ATIVO",
        vencimentoPlano: diasAtras(TOLERANCIA_PAGAMENTO_DIAS),
        temAssinatura: true,
      },
      AGORA,
    );
    expect(noLimite.permitido).toBe(true);
    expect(noLimite.motivo).toBe("plano-vigente");

    const passou = avaliarAcesso(
      {
        role: "admin",
        status: "ATIVO",
        vencimentoPlano: diasAtras(TOLERANCIA_PAGAMENTO_DIAS + 1),
        temAssinatura: true,
      },
      AGORA,
    );
    expect(passou.permitido).toBe(false);
    expect(passou.motivo).toBe("plano-vencido");
  });

  it("bloqueia quem está 2 meses sem pagar, mesmo com status ATIVO", () => {
    const r = avaliarAcesso(
      {
        role: "admin",
        status: "ATIVO",
        vencimentoPlano: diasAtras(60),
        temAssinatura: true,
      },
      AGORA,
    );
    expect(r.permitido).toBe(false);
    expect(r.motivo).toBe("plano-vencido");
  });

  it("legado sem vencimento, dentro do trial (criação + 14d + tolerância) é liberado como trial", () => {
    const criado = diasAtras(5); // há 5 dias
    const r = avaliarAcesso(
      {
        role: "admin",
        status: "ATIVO",
        vencimentoPlano: null,
        temAssinatura: false,
        empresaCriacao: criado,
      },
      AGORA,
    );
    expect(r.permitido).toBe(true);
    expect(r.motivo).toBe("trial-vigente");
    expect(r.limite!.getTime()).toBe(
      criado.getTime() + (TRIAL_DIAS_PADRAO + TOLERANCIA_TRIAL_DIAS) * DIA,
    );
  });

  it("legado sem vencimento, fora do trial (criação + 14d + 1d) é bloqueado como trial-vencido", () => {
    const criado = diasAtras(20); // há 20 dias
    const r = avaliarAcesso(
      {
        role: "admin",
        status: "ATIVO",
        vencimentoPlano: null,
        temAssinatura: false,
        empresaCriacao: criado,
      },
      AGORA,
    );
    expect(r.permitido).toBe(false);
    expect(r.motivo).toBe("trial-vencido");
  });

  it("sem empresaCriacao não concede acesso infinito (base = agora, trial começa agora)", () => {
    const r = avaliarAcesso(
      {
        role: "admin",
        status: "ATIVO",
        vencimentoPlano: null,
        temAssinatura: false,
      },
      AGORA,
    );
    // Sem base de criação, o fim do trial é agora + tolerância: já venceu.
    expect(r.permitido).toBe(false);
    expect(r.motivo).toBe("trial-vencido");
  });

  it("novo cadastro (criação = agora) libera trial de 14 dias", () => {
    const r = avaliarAcesso(
      {
        role: "admin",
        status: "EM_TESTE",
        vencimentoPlano: null,
        temAssinatura: false,
        empresaCriacao: AGORA,
      },
      AGORA,
    );
    expect(r.permitido).toBe(true);
    expect(r.motivo).toBe("trial-vigente");
    expect(r.diasRestantes).toBe(TRIAL_DIAS_PADRAO + TOLERANCIA_TRIAL_DIAS);
  });

  it("PAYMENT_RECEIVED (vencimentoPlano no futuro) libera plano vigente", () => {
    const venc = diasFrente(30);
    const r = avaliarAcesso(
      {
        role: "admin",
        status: "ATIVO",
        vencimentoPlano: venc,
        temAssinatura: true,
      },
      AGORA,
    );
    expect(r.permitido).toBe(true);
    expect(r.motivo).toBe("plano-vigente");
  });

  it("grace: cobrança vencida dentro dos 10 dias ainda libera; após 10 dias bloqueia", () => {
    // 9 dias de atraso: ainda no grace (tolerância 10d).
    const noGrace = avaliarAcesso(
      {
        role: "admin",
        status: "ATIVO",
        vencimentoPlano: diasAtras(9),
        temAssinatura: true,
      },
      AGORA,
    );
    expect(noGrace.permitido).toBe(true);
    expect(noGrace.motivo).toBe("plano-vigente");

    // 11 dias de atraso: ultrapassou o grace.
    const foraGrace = avaliarAcesso(
      {
        role: "admin",
        status: "ATIVO",
        vencimentoPlano: diasAtras(11),
        temAssinatura: true,
      },
      AGORA,
    );
    expect(foraGrace.permitido).toBe(false);
    expect(foraGrace.motivo).toBe("plano-vencido");
  });

  it("ATIVO sem vencimento e sem base de criação é bloqueado (fail-closed)", () => {
    const r = avaliarAcesso(
      { role: "admin", status: "ATIVO", vencimentoPlano: null, temAssinatura: true },
      AGORA,
    );
    expect(r.permitido).toBe(false);
    expect(r.motivo).toBe("trial-vencido");
  });

  it("libera por desbloqueio temporário válido e bloqueia após expirar", () => {
    const valido = avaliarAcesso(
      {
        role: "admin",
        status: "PAUSADO",
        vencimentoPlano: diasAtras(30),
        liberacaoTemporariaAte: diasFrente(1),
        temAssinatura: true,
      },
      AGORA,
    );
    expect(valido.permitido).toBe(true);
    expect(valido.motivo).toBe("liberacao-temporaria");

    const expirado = avaliarAcesso(
      {
        role: "admin",
        status: "PAUSADO",
        vencimentoPlano: diasAtras(30),
        liberacaoTemporariaAte: diasAtras(1),
        temAssinatura: true,
      },
      AGORA,
    );
    expect(expirado.permitido).toBe(false);
    expect(expirado.motivo).toBe("pausado");
  });

  it("bloqueia PENDENTE e CANCELADO", () => {
    expect(
      avaliarAcesso(
        { role: "admin", status: "PENDENTE", vencimentoPlano: diasFrente(30) },
        AGORA,
      ).motivo,
    ).toBe("pendente");

    expect(
      avaliarAcesso(
        {
          role: "admin",
          status: "CANCELADO",
          vencimentoPlano: diasFrente(30),
          temAssinatura: true,
        },
        AGORA,
      ).motivo,
    ).toBe("cancelado");
  });

  it("bloqueia usuário não-master sem empresa", () => {
    const r = avaliarAcesso({ role: "caixa", status: null }, AGORA);
    expect(r.permitido).toBe(false);
    expect(r.motivo).toBe("empresa-ausente");
  });

  it("desbloqueio temporário NÃO libera PENDENTE nem CANCELADO", () => {
    const pendente = avaliarAcesso(
      {
        role: "admin",
        status: "PENDENTE",
        vencimentoPlano: diasAtras(5),
        liberacaoTemporariaAte: diasFrente(5),
      },
      AGORA,
    );
    expect(pendente.permitido).toBe(false);
    expect(pendente.motivo).toBe("pendente");

    const cancelado = avaliarAcesso(
      {
        role: "admin",
        status: "CANCELADO",
        vencimentoPlano: diasAtras(5),
        liberacaoTemporariaAte: diasFrente(5),
        temAssinatura: true,
      },
      AGORA,
    );
    expect(cancelado.permitido).toBe(false);
    expect(cancelado.motivo).toBe("cancelado");
  });

  it("aceita data em string ISO, igual ao que vem do token", () => {
    const r = avaliarAcesso(
      {
        role: "admin",
        status: "ATIVO",
        vencimentoPlano: diasAtras(2).toISOString(),
        temAssinatura: true,
      },
      AGORA,
    );
    expect(r.permitido).toBe(true);
    expect(r.diasRestantes).toBe(TOLERANCIA_PAGAMENTO_DIAS - 2);
  });
});

describe("podeReativarManualmente", () => {
  it("exige pagamento confirmado", () => {
    expect(podeReativarManualmente("PAUSADO", false).permitido).toBe(false);
    expect(podeReativarManualmente("PAUSADO", true).permitido).toBe(true);
  });

  it("nunca reativa CANCELADO, mesmo com pagamento confirmado", () => {
    expect(podeReativarManualmente("CANCELADO", true).permitido).toBe(false);
    expect(podeReativarManualmente("CANCELADO", false).permitido).toBe(false);
  });
});

describe("decidirStatusSincronizado (mesmas tolerâncias do runtime)", () => {
  it("RECEIVED sem prova server-side NAO ativa: mantem o status atual", () => {
    expect(decidirStatusSincronizado("EM_TESTE", "RECEIVED", null, AGORA)).toBe(
      "EM_TESTE",
    );
    expect(decidirStatusSincronizado("PAUSADO", "RECEIVED", null, AGORA)).toBe(
      "PAUSADO",
    );
    expect(decidirStatusSincronizado("ATIVO", "RECEIVED", null, AGORA)).toBe(
      "ATIVO",
    );
    expect(
      decidirStatusSincronizado("desconhecido", "RECEIVED", null, AGORA),
    ).toBe("PAUSADO");
  });

  it("RECEIVED com prova server-side (pagamentoRecebido) ativa o plano", () => {
    expect(
      decidirStatusSincronizado("EM_TESTE", "RECEIVED", null, AGORA, true),
    ).toBe("ATIVO");
    expect(
      decidirStatusSincronizado("PAUSADO", "RECEIVED", null, AGORA, true),
    ).toBe("ATIVO");
    expect(
      decidirStatusSincronizado("desconhecido", "RECEIVED", null, AGORA, true),
    ).toBe("ATIVO");
  });

  it("CONFIRMED NAO ativa: mantem o status e nunca promove para ATIVO", () => {
    // Mesmo com vencimento no futuro, CONFIRMED nao libera o plano.
    expect(
      decidirStatusSincronizado("PAUSADO", "CONFIRMED", diasFrente(30), AGORA),
    ).toBe("PAUSADO");
    expect(
      decidirStatusSincronizado("EM_TESTE", "CONFIRMED", diasFrente(30), AGORA),
    ).toBe("EM_TESTE");
    expect(
      decidirStatusSincronizado("ATIVO", "CONFIRMED", diasFrente(30), AGORA),
    ).toBe("ATIVO");
    expect(
      decidirStatusSincronizado("desconhecido", "CONFIRMED", null, AGORA),
    ).toBe("PAUSADO");
  });

  it("INACTIVE/CANCELLED vira CANCELADO", () => {
    expect(decidirStatusSincronizado("ATIVO", "INACTIVE", null, AGORA)).toBe(
      "CANCELADO",
    );
    expect(decidirStatusSincronizado("ATIVO", "CANCELLED", null, AGORA)).toBe(
      "CANCELADO",
    );
  });

  it("assinatura ACTIVE nao promove para ATIVO sem PAYMENT_RECEIVED", () => {
    // Sem prova server-side: nunca sobe para ATIVO (fail-closed).
    expect(
      decidirStatusSincronizado("PAUSADO", "ACTIVE", diasFrente(30), AGORA, false),
    ).toBe("PAUSADO");
    // Com prova de RECEIVED: libera.
    expect(
      decidirStatusSincronizado("PAUSADO", "ACTIVE", diasFrente(30), AGORA, true),
    ).toBe("ATIVO");
    // Ja ativo permanece ativo (o sync nao pausa por falta de prova).
    expect(
      decidirStatusSincronizado("ATIVO", "ACTIVE", diasFrente(30), AGORA, false),
    ).toBe("ATIVO");
  });

  it("ASSINATURA ACTIVE vencida pausa mesmo com prova de pagamento", () => {
    expect(
      decidirStatusSincronizado("ATIVO", "ACTIVE", diasAtras(30), AGORA, true),
    ).toBe("PAUSADO");
  });

  it("OVERDUE dentro dos 10 dias NÃO pausa", () => {
    expect(
      decidirStatusSincronizado(
        "ATIVO",
        "OVERDUE",
        diasAtras(TOLERANCIA_PAGAMENTO_DIAS),
        AGORA,
      ),
    ).toBe("ATIVO");
  });

  it("OVERDUE além dos 10 dias pausa", () => {
    expect(
      decidirStatusSincronizado(
        "ATIVO",
        "OVERDUE",
        diasAtras(TOLERANCIA_PAGAMENTO_DIAS + 1),
        AGORA,
      ),
    ).toBe("PAUSADO");
  });

  it("EM_TESTE preserva status dentro da tolerância trial e pausa depois", () => {
    expect(
      decidirStatusSincronizado(
        "EM_TESTE",
        "ACTIVE",
        diasAtras(TOLERANCIA_TRIAL_DIAS),
        AGORA,
      ),
    ).toBe("EM_TESTE");
    expect(
      decidirStatusSincronizado(
        "EM_TESTE",
        "ACTIVE",
        diasAtras(TOLERANCIA_TRIAL_DIAS + 1),
        AGORA,
      ),
    ).toBe("PAUSADO");
  });
});

describe("motivoParaBloqueio", () => {
  it("mapeia para os valores aceitos pela página /bloqueado", () => {
    expect(motivoParaBloqueio("pendente")).toBe("pendente");
    expect(motivoParaBloqueio("cancelado")).toBe("cancelado");
    expect(motivoParaBloqueio("pausado")).toBe("pausado");
    expect(motivoParaBloqueio("plano-vencido")).toBe("vencido");
    expect(motivoParaBloqueio("trial-vencido")).toBe("vencido");
    expect(motivoParaBloqueio("empresa-ausente")).toBe("vencido");
  });
});