import {
  avaliarAcesso,
  decidirStatusSincronizado,
  TOLERANCIA_PAGAMENTO_DIAS,
  TOLERANCIA_TRIAL_DIAS,
} from "@/lib/access";
import {
  OVERDUE_GRACE_DAYS,
  TRIAL_TOLERANCE_DAYS,
  calcularDiasAtraso,
  deveBloquearPorAtraso,
} from "@/lib/billing-policy";

describe("Regressão: Corte no vencimento com tolerância zero (0 dias)", () => {
  const AGORA = new Date("2026-11-18T12:00:00.000Z");

  describe("Constantes canônicas de política de corte", () => {
    it("tolerância de trial e plano são estritamente 0 dias", () => {
      expect(TRIAL_TOLERANCE_DAYS).toBe(0);
      expect(OVERDUE_GRACE_DAYS).toBe(0);
      expect(TOLERANCIA_TRIAL_DIAS).toBe(0);
      expect(TOLERANCIA_PAGAMENTO_DIAS).toBe(0);
    });
  });

  describe("Fronteiras de avaliarAcesso para plano contratado (ATIVO)", () => {
    it("vencimento no futuro (+1 segundo e +1 dia): ACESSO LIBERADO", () => {
      const futuro1s = avaliarAcesso(
        {
          role: "admin",
          status: "ATIVO",
          vencimentoPlano: new Date(AGORA.getTime() + 1000),
          temAssinatura: true,
        },
        AGORA,
      );
      expect(futuro1s.permitido).toBe(true);
      expect(futuro1s.motivo).toBe("plano-vigente");

      const futuro1d = avaliarAcesso(
        {
          role: "admin",
          status: "ATIVO",
          vencimentoPlano: new Date(AGORA.getTime() + 24 * 60 * 60 * 1000),
          temAssinatura: true,
        },
        AGORA,
      );
      expect(futuro1d.permitido).toBe(true);
      expect(futuro1d.motivo).toBe("plano-vigente");
      expect(futuro1d.diasRestantes).toBe(1);
    });

    it("vencimento no instante exato (agora): ACESSO LIBERADO", () => {
      const exato = avaliarAcesso(
        {
          role: "admin",
          status: "ATIVO",
          vencimentoPlano: AGORA,
          temAssinatura: true,
        },
        AGORA,
      );
      expect(exato.permitido).toBe(true);
      expect(exato.motivo).toBe("plano-vigente");
    });

    it("vencimento no passado (-1 ms, -1 segundo, -1 dia): ACESSO BLOQUEADO IMEDIATAMENTE", () => {
      const passado1ms = avaliarAcesso(
        {
          role: "admin",
          status: "ATIVO",
          vencimentoPlano: new Date(AGORA.getTime() - 1),
          temAssinatura: true,
        },
        AGORA,
      );
      expect(passado1ms.permitido).toBe(false);
      expect(passado1ms.motivo).toBe("plano-vencido");

      const passado1s = avaliarAcesso(
        {
          role: "admin",
          status: "ATIVO",
          vencimentoPlano: new Date(AGORA.getTime() - 1000),
          temAssinatura: true,
        },
        AGORA,
      );
      expect(passado1s.permitido).toBe(false);
      expect(passado1s.motivo).toBe("plano-vencido");

      const passado1d = avaliarAcesso(
        {
          role: "admin",
          status: "ATIVO",
          vencimentoPlano: new Date(AGORA.getTime() - 24 * 60 * 60 * 1000),
          temAssinatura: true,
        },
        AGORA,
      );
      expect(passado1d.permitido).toBe(false);
      expect(passado1d.motivo).toBe("plano-vencido");
    });
  });

  describe("Fronteiras de avaliarAcesso para trial (EM_TESTE)", () => {
    it("trial no futuro ou no instante exato: ACESSO LIBERADO", () => {
      const futuro = avaliarAcesso(
        {
          role: "admin",
          status: "EM_TESTE",
          vencimentoPlano: new Date(AGORA.getTime() + 1000),
          temAssinatura: true,
        },
        AGORA,
      );
      expect(futuro.permitido).toBe(true);
      expect(futuro.motivo).toBe("trial-vigente");

      const exato = avaliarAcesso(
        {
          role: "admin",
          status: "EM_TESTE",
          vencimentoPlano: AGORA,
          temAssinatura: true,
        },
        AGORA,
      );
      expect(exato.permitido).toBe(true);
      expect(exato.motivo).toBe("trial-vigente");
    });

    it("trial vencido há 1 ms ou 1 segundo: BLOQUEADO (zero tolerância)", () => {
      const passado1ms = avaliarAcesso(
        {
          role: "admin",
          status: "EM_TESTE",
          vencimentoPlano: new Date(AGORA.getTime() - 1),
          temAssinatura: true,
        },
        AGORA,
      );
      expect(passado1ms.permitido).toBe(false);
      expect(passado1ms.motivo).toBe("trial-vencido");

      const passado1s = avaliarAcesso(
        {
          role: "admin",
          status: "EM_TESTE",
          vencimentoPlano: new Date(AGORA.getTime() - 1000),
          temAssinatura: true,
        },
        AGORA,
      );
      expect(passado1s.permitido).toBe(false);
      expect(passado1s.motivo).toBe("trial-vencido");
    });
  });

  describe("Fronteiras de cálculo de atraso e bloqueio (webhook / cron)", () => {
    it("calcularDiasAtraso com data de vencimento", () => {
      const venc = new Date("2026-11-18T00:00:00.000Z");
      // Mesmo dia: 0 dias de atraso
      expect(calcularDiasAtraso(venc, new Date("2026-11-18T00:00:00.000Z"))).toBe(0);
      // Dia seguinte: 1 dia de atraso
      expect(calcularDiasAtraso(venc, new Date("2026-11-19T00:00:00.000Z"))).toBe(1);
      // Dia anterior: -1 dia (não vencido)
      expect(calcularDiasAtraso(venc, new Date("2026-11-17T00:00:00.000Z"))).toBe(-1);
    });

    it("deveBloquearPorAtraso com OVERDUE_GRACE_DAYS = 0", () => {
      expect(deveBloquearPorAtraso(-1)).toBe(false); // antes do vencimento -> não bloqueia
      expect(deveBloquearPorAtraso(0)).toBe(true);   // no dia exato do vencimento -> bloqueia imediatamente
      expect(deveBloquearPorAtraso(1)).toBe(true);   // após vencimento -> bloqueia imediatamente
    });
  });

  describe("Fronteiras de decidirStatusSincronizado e preservação de segurança", () => {
    it("OVERDUE com vencimento passado pausa imediatamente (zero tolerância)", () => {
      const statusPausado = decidirStatusSincronizado(
        "ATIVO",
        "OVERDUE",
        new Date(AGORA.getTime() - 1000),
        AGORA,
      );
      expect(statusPausado).toBe("PAUSADO");
    });

    it("preserva segurança: sem prova server-side de pagamento recebido, NÃO promove para ATIVO", () => {
      // RECEIVED sem prova server-side (pagamentoRecebido = false) mantém PAUSADO
      const semProva = decidirStatusSincronizado(
        "PAUSADO",
        "RECEIVED",
        new Date(AGORA.getTime() + 10000),
        AGORA,
        false, // pagamentoRecebido = false
      );
      expect(semProva).toBe("PAUSADO");

      // CONFIRMED nunca promove PAUSADO para ATIVO
      const confirmed = decidirStatusSincronizado(
        "PAUSADO",
        "CONFIRMED",
        new Date(AGORA.getTime() + 10000),
        AGORA,
        false,
      );
      expect(confirmed).toBe("PAUSADO");
    });

    it("preserva segurança: status CANCELADO no Asaas só cancela a empresa com confirmação terminal", () => {
      // Sem confirmarTerminal, mantém o status atual
      const semConfirmar = decidirStatusSincronizado(
        "ATIVO",
        "CANCELLED",
        null,
        AGORA,
        false,
        { confirmarTerminal: false },
      );
      expect(semConfirmar).toBe("ATIVO");

      // Com confirmarTerminal = true, transiciona para CANCELADO
      const comConfirmar = decidirStatusSincronizado(
        "ATIVO",
        "CANCELLED",
        null,
        AGORA,
        false,
        { confirmarTerminal: true },
      );
      expect(comConfirmar).toBe("CANCELADO");
    });
  });
});
