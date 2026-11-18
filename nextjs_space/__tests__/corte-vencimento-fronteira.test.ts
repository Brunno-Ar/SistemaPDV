import {
  avaliarAcesso,
  decidirStatusSincronizado,
  podeReativarManualmente,
  TOLERANCIA_PAGAMENTO_DIAS,
  TOLERANCIA_TRIAL_DIAS,
  obterLimiteVencimentoSaoPaulo,
} from "@/lib/access";
import {
  OVERDUE_GRACE_DAYS,
  TRIAL_TOLERANCE_DAYS,
  calcularDiasAtraso,
  deveBloquearPorAtraso,
} from "@/lib/billing-policy";

describe("Regressão: Corte no vencimento inclusivo em America/Sao_Paulo (zero tolerância adicional)", () => {
  describe("Constantes canônicas de política de corte", () => {
    it("tolerância de trial e plano são estritamente 0 dias", () => {
      expect(TRIAL_TOLERANCE_DAYS).toBe(0);
      expect(OVERDUE_GRACE_DAYS).toBe(0);
      expect(TOLERANCIA_TRIAL_DIAS).toBe(0);
      expect(TOLERANCIA_PAGAMENTO_DIAS).toBe(0);
    });
  });

  describe("obterLimiteVencimentoSaoPaulo", () => {
    it("converte data civil 2026-11-18 para 23:59:59.999 BRT (02:59:59.999 UTC do dia 19)", () => {
      const limite = obterLimiteVencimentoSaoPaulo("2026-11-18");
      expect(limite).not.toBeNull();
      expect(limite!.toISOString()).toBe("2026-11-19T02:59:59.999Z");
    });

    it("converte Date UTC midnight 2026-11-18T00:00:00.000Z para o fim do dia BRT correspondente", () => {
      const limite = obterLimiteVencimentoSaoPaulo(new Date("2026-11-18T00:00:00.000Z"));
      expect(limite).not.toBeNull();
      expect(limite!.toISOString()).toBe("2026-11-19T02:59:59.999Z");
    });

    it("retorna null para valores nulos ou inválidos", () => {
      expect(obterLimiteVencimentoSaoPaulo(null)).toBeNull();
      expect(obterLimiteVencimentoSaoPaulo(undefined)).toBeNull();
      expect(obterLimiteVencimentoSaoPaulo("invalido")).toBeNull();
    });
  });

  describe("Cenário de produção: Adega FreeStyle Drinks (vencimento 18/11/2026)", () => {
    const vencimento = "2026-11-18";

    it("18/11 às 08:00 BRT (11:00 UTC): ACESSO LIBERADO", () => {
      const agora = new Date("2026-11-18T11:00:00.000Z");
      const avaliacao = avaliarAcesso(
        {
          role: "admin",
          status: "ATIVO",
          vencimentoPlano: vencimento,
          temAssinatura: true,
        },
        agora,
      );
      expect(avaliacao.permitido).toBe(true);
      expect(avaliacao.motivo).toBe("plano-vigente");
      expect(calcularDiasAtraso(vencimento, agora)).toBe(0);
      expect(deveBloquearPorAtraso(calcularDiasAtraso(vencimento, agora))).toBe(false);
    });

    it("18/11 às 12:00 BRT (15:00 UTC): ACESSO LIBERADO", () => {
      const agora = new Date("2026-11-18T15:00:00.000Z");
      const avaliacao = avaliarAcesso(
        {
          role: "admin",
          status: "ATIVO",
          vencimentoPlano: vencimento,
          temAssinatura: true,
        },
        agora,
      );
      expect(avaliacao.permitido).toBe(true);
      expect(avaliacao.motivo).toBe("plano-vigente");
      expect(calcularDiasAtraso(vencimento, agora)).toBe(0);
      expect(deveBloquearPorAtraso(calcularDiasAtraso(vencimento, agora))).toBe(false);
    });

    it("18/11 às 23:59:59.999 BRT (19/11 às 02:59:59.999 UTC): ACESSO LIBERADO (limite inclusivo)", () => {
      const agora = new Date("2026-11-19T02:59:59.999Z");
      const avaliacao = avaliarAcesso(
        {
          role: "admin",
          status: "ATIVO",
          vencimentoPlano: vencimento,
          temAssinatura: true,
        },
        agora,
      );
      expect(avaliacao.permitido).toBe(true);
      expect(avaliacao.motivo).toBe("plano-vigente");
      expect(calcularDiasAtraso(vencimento, agora)).toBe(0);
      expect(deveBloquearPorAtraso(calcularDiasAtraso(vencimento, agora))).toBe(false);
    });

    it("19/11 às 00:00:00.000 BRT (19/11 às 03:00:00.000 UTC): ACESSO BLOQUEADO (virada do dia)", () => {
      const agora = new Date("2026-11-19T03:00:00.000Z");
      const avaliacao = avaliarAcesso(
        {
          role: "admin",
          status: "ATIVO",
          vencimentoPlano: vencimento,
          temAssinatura: true,
        },
        agora,
      );
      expect(avaliacao.permitido).toBe(false);
      expect(avaliacao.motivo).toBe("plano-vencido");
      expect(calcularDiasAtraso(vencimento, agora)).toBe(1);
      expect(deveBloquearPorAtraso(calcularDiasAtraso(vencimento, agora))).toBe(true);
    });

    it("19/11 às 08:00 BRT (19/11 às 11:00:00.000 UTC): ACESSO BLOQUEADO", () => {
      const agora = new Date("2026-11-19T11:00:00.000Z");
      const avaliacao = avaliarAcesso(
        {
          role: "admin",
          status: "ATIVO",
          vencimentoPlano: vencimento,
          temAssinatura: true,
        },
        agora,
      );
      expect(avaliacao.permitido).toBe(false);
      expect(avaliacao.motivo).toBe("plano-vencido");
      expect(calcularDiasAtraso(vencimento, agora)).toBe(1);
      expect(deveBloquearPorAtraso(calcularDiasAtraso(vencimento, agora))).toBe(true);
    });
  });

  describe("Fronteiras de avaliarAcesso para trial (EM_TESTE)", () => {
    const vencTrial = "2026-11-18";

    it("trial no dia do vencimento às 23:59:59 BRT: ACESSO LIBERADO", () => {
      const agora = new Date("2026-11-19T02:59:59.999Z");
      const avaliacao = avaliarAcesso(
        {
          role: "admin",
          status: "EM_TESTE",
          vencimentoPlano: vencTrial,
          temAssinatura: true,
        },
        agora,
      );
      expect(avaliacao.permitido).toBe(true);
      expect(avaliacao.motivo).toBe("trial-vigente");
      expect(avaliacao.diasRestantes).toBe(0);
    });

    it("trial vencido às 00:00:00 BRT do dia seguinte: BLOQUEADO (zero tolerância)", () => {
      const agora = new Date("2026-11-19T03:00:00.000Z");
      const avaliacao = avaliarAcesso(
        {
          role: "admin",
          status: "EM_TESTE",
          vencimentoPlano: vencTrial,
          temAssinatura: true,
        },
        agora,
      );
      expect(avaliacao.permitido).toBe(false);
      expect(avaliacao.motivo).toBe("trial-vencido");
      expect(avaliacao.diasRestantes).toBe(0);
    });
  });

  describe("Fronteiras de cálculo de atraso e bloqueio (webhook / cron)", () => {
    it("calcularDiasAtraso respeita fuso America/Sao_Paulo", () => {
      const venc = "2026-11-18";
      // Dia anterior: -1
      expect(calcularDiasAtraso(venc, new Date("2026-11-17T20:00:00.000Z"))).toBe(-1);
      // Mesmo dia às 10h BRT: 0
      expect(calcularDiasAtraso(venc, new Date("2026-11-18T13:00:00.000Z"))).toBe(0);
      // Mesmo dia às 23:59:59 BRT (02:59:59 UTC do dia 19): 0
      expect(calcularDiasAtraso(venc, new Date("2026-11-19T02:59:59.000Z"))).toBe(0);
      // Virada às 00:00:00 BRT (03:00:00 UTC do dia 19): 1
      expect(calcularDiasAtraso(venc, new Date("2026-11-19T03:00:00.000Z"))).toBe(1);
    });

    it("deveBloquearPorAtraso com OVERDUE_GRACE_DAYS = 0", () => {
      expect(deveBloquearPorAtraso(-1)).toBe(false); // antes do vencimento -> não bloqueia
      expect(deveBloquearPorAtraso(0)).toBe(false);  // no dia do vencimento -> não bloqueia (inclusivo!)
      expect(deveBloquearPorAtraso(1)).toBe(true);   // a partir do dia seguinte -> bloqueia imediatamente
    });
  });

  describe("Preservação de estados bloqueados e confirmação de pagamento", () => {
    const vencimentoFuturo = "2026-12-31";
    const agora = new Date("2026-11-18T12:00:00.000Z");

    it("estados CANCELADO, PAUSADO e PENDENTE continuam bloqueados mesmo com vencimento no futuro", () => {
      for (const st of ["CANCELADO", "PAUSADO", "PENDENTE"] as const) {
        const r = avaliarAcesso(
          {
            role: "admin",
            status: st,
            vencimentoPlano: vencimentoFuturo,
            temAssinatura: true,
          },
          agora,
        );
        expect(r.permitido).toBe(false);
      }
    });

    it("RECEIVED com pagamentoRecebido = true promove para ATIVO via decidirStatusSincronizado", () => {
      const statusAtivado = decidirStatusSincronizado(
        "PAUSADO",
        "RECEIVED",
        vencimentoFuturo,
        agora,
        true, // pagamentoRecebido = true comprovado server-side
      );
      expect(statusAtivado).toBe("ATIVO");
    });

    it("RECEIVED sem prova server-side (pagamentoRecebido = false) mantém PAUSADO", () => {
      const statusPausado = decidirStatusSincronizado(
        "PAUSADO",
        "RECEIVED",
        vencimentoFuturo,
        agora,
        false,
      );
      expect(statusPausado).toBe("PAUSADO");
    });

    it("podeReativarManualmente permite com prova de pagamento e impede CANCELADO", () => {
      expect(podeReativarManualmente("PAUSADO", true).permitido).toBe(true);
      expect(podeReativarManualmente("PAUSADO", false).permitido).toBe(false);
      expect(podeReativarManualmente("CANCELADO", true).permitido).toBe(false);
    });
  });
});
