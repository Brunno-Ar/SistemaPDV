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

  it("tolerâncias: trial 0 dias, plano 0 dias (corte no vencimento)", () => {
    expect(TOLERANCIA_TRIAL_DIAS).toBe(0);
    expect(TOLERANCIA_PAGAMENTO_DIAS).toBe(0);
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

  it("bloqueia trial imediatamente após o vencimento (zero tolerância, inclusivo até 23:59:59 BRT)", () => {
    const vigente = avaliarAcesso(
      {
        role: "admin",
        status: "EM_TESTE",
        vencimentoPlano: AGORA,
        temAssinatura: true,
      },
      AGORA,
    );
    expect(vigente.permitido).toBe(true);
    expect(vigente.motivo).toBe("trial-vigente");

    // No mesmo dia do vencimento às 23:59:59 BRT (02:59:59 UTC do dia seguinte): ainda liberado
    const fimDoDiaBRT = new Date("2026-11-13T02:59:59.999Z");
    const noFimDoDia = avaliarAcesso(
      {
        role: "admin",
        status: "EM_TESTE",
        vencimentoPlano: AGORA,
        temAssinatura: true,
      },
      fimDoDiaBRT,
    );
    expect(noFimDoDia.permitido).toBe(true);
    expect(noFimDoDia.motivo).toBe("trial-vigente");

    // Na virada às 00:00:00 BRT do dia seguinte (03:00:00 UTC): bloqueado imediatamente
    const viradaDiaSeguinte = new Date("2026-11-13T03:00:00.000Z");
    const vencidoVirada = avaliarAcesso(
      {
        role: "admin",
        status: "EM_TESTE",
        vencimentoPlano: AGORA,
        temAssinatura: true,
      },
      viradaDiaSeguinte,
    );
    expect(vencidoVirada.permitido).toBe(false);
    expect(vencidoVirada.motivo).toBe("trial-vencido");

    const vencido1d = avaliarAcesso(
      {
        role: "admin",
        status: "EM_TESTE",
        vencimentoPlano: diasAtras(1),
        temAssinatura: true,
      },
      AGORA,
    );
    expect(vencido1d.permitido).toBe(false);
    expect(vencido1d.motivo).toBe("trial-vencido");
  });

  it("bloqueia cobrança vencida imediatamente após o vencimento (zero tolerância, inclusivo até 23:59:59 BRT)", () => {
    const noLimite = avaliarAcesso(
      {
        role: "admin",
        status: "ATIVO",
        vencimentoPlano: AGORA,
        temAssinatura: true,
      },
      AGORA,
    );
    expect(noLimite.permitido).toBe(true);
    expect(noLimite.motivo).toBe("plano-vigente");

    // No mesmo dia do vencimento às 23:59:59 BRT: ainda liberado
    const fimDoDiaBRT = new Date("2026-11-13T02:59:59.999Z");
    const noFimDoDia = avaliarAcesso(
      {
        role: "admin",
        status: "ATIVO",
        vencimentoPlano: AGORA,
        temAssinatura: true,
      },
      fimDoDiaBRT,
    );
    expect(noFimDoDia.permitido).toBe(true);
    expect(noFimDoDia.motivo).toBe("plano-vigente");

    // Na virada às 00:00:00 BRT do dia seguinte: bloqueado imediatamente
    const viradaDiaSeguinte = new Date("2026-11-13T03:00:00.000Z");
    const vencidoVirada = avaliarAcesso(
      {
        role: "admin",
        status: "ATIVO",
        vencimentoPlano: AGORA,
        temAssinatura: true,
      },
      viradaDiaSeguinte,
    );
    expect(vencidoVirada.permitido).toBe(false);
    expect(vencidoVirada.motivo).toBe("plano-vencido");

    const passou = avaliarAcesso(
      {
        role: "admin",
        status: "ATIVO",
        vencimentoPlano: diasAtras(1),
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

  it("legado com assinatura e vencimento nulo, dentro do trial (criação + 14d + tolerância) é liberado como trial", () => {
    const criado = diasAtras(5); // há 5 dias
    const r = avaliarAcesso(
      {
        role: "admin",
        status: "ATIVO",
        vencimentoPlano: null,
        temAssinatura: true,
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

  it("legado com assinatura e vencimento nulo, fora do trial (criação + 14d) é bloqueado como trial-vencido", () => {
    const criado = diasAtras(15); // há 15 dias (> 14 dias)
    const r = avaliarAcesso(
      {
        role: "admin",
        status: "ATIVO",
        vencimentoPlano: null,
        temAssinatura: true,
        empresaCriacao: criado,
      },
      AGORA,
    );
    expect(r.permitido).toBe(false);
    expect(r.motivo).toBe("trial-vencido");
  });

  it("ATIVO sem assinatura e sem vencimento falha fechado com sem-vencimento", () => {
    const r = avaliarAcesso(
      {
        role: "admin",
        status: "ATIVO",
        vencimentoPlano: null,
        temAssinatura: false,
      },
      AGORA,
    );
    // Nenhuma base de criação + sem assinatura: fail-closed sem-vencimento.
    expect(r.permitido).toBe(false);
    expect(r.motivo).toBe("sem-vencimento");
  });

  it("ATIVO com assinatura mas sem empresaCriacao falha fechado com sem-vencimento", () => {
    const r = avaliarAcesso(
      {
        role: "admin",
        status: "ATIVO",
        vencimentoPlano: null,
        temAssinatura: true,
      },
      AGORA,
    );
    expect(r.permitido).toBe(false);
    expect(r.motivo).toBe("sem-vencimento");
  });

  it("novo cadastro com assinatura e vencimento nulo deriva trial de 14 dias da criação", () => {
    const r = avaliarAcesso(
      {
        role: "admin",
        status: "EM_TESTE",
        vencimentoPlano: null,
        temAssinatura: true,
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

  it("zero tolerância: cobrança vencida há 1 dia já bloqueia, sem janela adicional de 10 dias", () => {
    // 1 dia de atraso: já bloqueia (zero tolerância)
    const atraso1d = avaliarAcesso(
      {
        role: "admin",
        status: "ATIVO",
        vencimentoPlano: diasAtras(1),
        temAssinatura: true,
      },
      AGORA,
    );
    expect(atraso1d.permitido).toBe(false);
    expect(atraso1d.motivo).toBe("plano-vencido");

    // 9 dias de atraso (antiga janela de tolerância): bloqueado
    const atraso9d = avaliarAcesso(
      {
        role: "admin",
        status: "ATIVO",
        vencimentoPlano: diasAtras(9),
        temAssinatura: true,
      },
      AGORA,
    );
    expect(atraso9d.permitido).toBe(false);
    expect(atraso9d.motivo).toBe("plano-vencido");

    // 10 dias de atraso: bloqueado
    const atraso10d = avaliarAcesso(
      {
        role: "admin",
        status: "ATIVO",
        vencimentoPlano: diasAtras(10),
        temAssinatura: true,
      },
      AGORA,
    );
    expect(atraso10d.permitido).toBe(false);
    expect(atraso10d.motivo).toBe("plano-vencido");
  });

  it("ATIVO com assinatura, sem vencimento e sem empresaCriacao falha fechado com sem-vencimento", () => {
    const r = avaliarAcesso(
      { role: "admin", status: "ATIVO", vencimentoPlano: null, temAssinatura: true },
      AGORA,
    );
    expect(r.permitido).toBe(false);
    expect(r.motivo).toBe("sem-vencimento");
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
    // Data futura em string ISO: permitida
    const rFuturo = avaliarAcesso(
      {
        role: "admin",
        status: "ATIVO",
        vencimentoPlano: diasFrente(2).toISOString(),
        temAssinatura: true,
      },
      AGORA,
    );
    expect(rFuturo.permitido).toBe(true);
    expect(rFuturo.diasRestantes).toBe(2);

    // Data passada em string ISO: bloqueada imediatamente (zero tolerância)
    const rPassado = avaliarAcesso(
      {
        role: "admin",
        status: "ATIVO",
        vencimentoPlano: diasAtras(2).toISOString(),
        temAssinatura: true,
      },
      AGORA,
    );
    expect(rPassado.permitido).toBe(false);
    expect(rPassado.motivo).toBe("plano-vencido");
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

  it("INACTIVE vira PAUSADO; CANCELLED so com confirmacao terminal", () => {
    // Assinatura inativa nao e cancelamento: pausa reversivel.
    expect(decidirStatusSincronizado("ATIVO", "INACTIVE", null, AGORA)).toBe(
      "PAUSADO",
    );
    expect(
      decidirStatusSincronizado("EM_TESTE", "INACTIVE", null, AGORA),
    ).toBe("PAUSADO");
    // Terminal exige flag explicita; sem ela o status atual e preservado.
    expect(decidirStatusSincronizado("ATIVO", "CANCELLED", null, AGORA)).toBe(
      "ATIVO",
    );
    expect(
      decidirStatusSincronizado("ATIVO", "CANCELLED", null, AGORA, false, {
        confirmarTerminal: true,
      }),
    ).toBe("CANCELADO");
    expect(
      decidirStatusSincronizado("ATIVO", "CANCELED", null, AGORA, false, {
        confirmarTerminal: true,
      }),
    ).toBe("CANCELADO");
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

  it("OVERDUE no futuro mantém ATIVO; vencido pausa imediatamente (zero tolerância)", () => {
    // Vencimento futuro ainda é ATIVO
    expect(
      decidirStatusSincronizado(
        "ATIVO",
        "OVERDUE",
        diasFrente(5),
        AGORA,
      ),
    ).toBe("ATIVO");

    // Vencimento hoje no momento exato ainda é ATIVO
    expect(
      decidirStatusSincronizado(
        "ATIVO",
        "OVERDUE",
        AGORA,
        AGORA,
      ),
    ).toBe("ATIVO");

    // No dia do vencimento, OVERDUE preserva ATIVO até 23:59:59 BRT
    expect(
      decidirStatusSincronizado(
        "ATIVO",
        "OVERDUE",
        AGORA,
        new Date("2026-11-13T02:59:59.999Z"), // 23:59:59 BRT de 12/11
      ),
    ).toBe("ATIVO");

    // Na virada às 00:00:00 BRT do dia seguinte (03:00 UTC) ou vencimento passado (1d), pausa
    expect(
      decidirStatusSincronizado(
        "ATIVO",
        "OVERDUE",
        AGORA,
        new Date("2026-11-13T03:00:00.000Z"), // 00:00:00 BRT de 13/11
      ),
    ).toBe("PAUSADO");

    expect(
      decidirStatusSincronizado(
        "ATIVO",
        "OVERDUE",
        diasAtras(1),
        AGORA,
      ),
    ).toBe("PAUSADO");
  });

  it("EM_TESTE no vencimento preserva status; após vencimento pausa imediatamente", () => {
    expect(
      decidirStatusSincronizado(
        "EM_TESTE",
        "ACTIVE",
        AGORA,
        AGORA,
      ),
    ).toBe("EM_TESTE");

    // No mesmo dia do vencimento às 23:59:59 BRT preserva EM_TESTE
    expect(
      decidirStatusSincronizado(
        "EM_TESTE",
        "ACTIVE",
        AGORA,
        new Date("2026-11-13T02:59:59.999Z"),
      ),
    ).toBe("EM_TESTE");

    // Na virada às 00:00:00 BRT do dia seguinte pausa imediatamente
    expect(
      decidirStatusSincronizado(
        "EM_TESTE",
        "ACTIVE",
        AGORA,
        new Date("2026-11-13T03:00:00.000Z"),
      ),
    ).toBe("PAUSADO");

    expect(
      decidirStatusSincronizado(
        "EM_TESTE",
        "ACTIVE",
        diasAtras(1),
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