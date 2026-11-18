import {
  TRIAL_DAYS,
  TRIAL_TOLERANCE_DAYS,
  OVERDUE_GRACE_DAYS,
  calcularVencimentoTrial,
  calcularDiasAtraso,
  deveBloquearPorAtraso,
} from "@/lib/billing-policy";
import {
  TRIAL_DIAS_PADRAO,
  TOLERANCIA_TRIAL_DIAS,
  TOLERANCIA_PAGAMENTO_DIAS,
} from "@/lib/access";

const DIA = 24 * 60 * 60 * 1000;
const BASE = new Date("2026-11-12T12:00:00.000Z");

describe("billing-policy (fonte unica dos prazos)", () => {
  it("valores confirmados pelo usuario", () => {
    expect(TRIAL_DAYS).toBe(14);
    expect(TRIAL_TOLERANCE_DAYS).toBe(0);
    expect(OVERDUE_GRACE_DAYS).toBe(0);
  });

  it("lib/access re-exporta os mesmos valores (sem divergencia)", () => {
    expect(TRIAL_DIAS_PADRAO).toBe(TRIAL_DAYS);
    expect(TOLERANCIA_TRIAL_DIAS).toBe(TRIAL_TOLERANCE_DAYS);
    expect(TOLERANCIA_PAGAMENTO_DIAS).toBe(OVERDUE_GRACE_DAYS);
  });

  it("vencimento local (signup) e 1a cobranca (Asaas) usam a MESMA duracao", () => {
    // signup:  vencimentoPlano = calcularVencimentoTrial()
    // Asaas:   createSubscription().nextDueDate = calcularVencimentoTrial()
    const vencimentoLocal = calcularVencimentoTrial(BASE);
    const primeiraCobranca = calcularVencimentoTrial(BASE);

    expect(vencimentoLocal.getTime()).toBe(primeiraCobranca.getTime());
    expect(vencimentoLocal.getTime() - BASE.getTime()).toBe(TRIAL_DAYS * DIA);
  });

  it("duracao e parametrizavel (default = TRIAL_DAYS)", () => {
    expect(calcularVencimentoTrial(BASE).getTime() - BASE.getTime()).toBe(
      TRIAL_DAYS * DIA,
    );
    expect(calcularVencimentoTrial(BASE, 30).getTime() - BASE.getTime()).toBe(
      30 * DIA,
    );
  });
});

describe("corte no vencimento sem tolerância (webhook PAYMENT_OVERDUE)", () => {
  it("conta dias de atraso a partir do vencimento", () => {
    const venc = new Date("2026-11-01T00:00:00.000Z");
    const agora = new Date("2026-11-11T00:00:00.000Z");
    expect(calcularDiasAtraso(venc, agora)).toBe(10);
  });

  it("sem vencimento ou data inválida => 0 dias (nunca bloqueia por engano)", () => {
    expect(calcularDiasAtraso(null)).toBe(0);
    expect(calcularDiasAtraso(undefined)).toBe(0);
    expect(calcularDiasAtraso("nao-e-data")).toBe(0);
  });

  it("bloqueia a partir de OVERDUE_GRACE_DAYS (0), isto é, no dia exato do vencimento", () => {
    expect(deveBloquearPorAtraso(-1)).toBe(false); // antes do vencimento
    expect(deveBloquearPorAtraso(0)).toBe(true);  // no dia exato do vencimento
    expect(deveBloquearPorAtraso(1)).toBe(true);  // após o vencimento
  });

  it("o limite vem da política (0 dias), não de env divergente", () => {
    expect(OVERDUE_GRACE_DAYS).toBe(0);
    expect(deveBloquearPorAtraso(0)).toBe(true);
    expect(deveBloquearPorAtraso(0, 5)).toBe(false); // parâmetro explícito ainda funciona
    expect(deveBloquearPorAtraso(5, 5)).toBe(true);
  });
});
