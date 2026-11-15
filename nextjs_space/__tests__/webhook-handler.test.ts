/**
 * @jest-environment node
 *
 * Testa o HANDLER REAL do webhook (`app/api/webhooks/asaas/route.ts`) com
 * Prisma e Asaas mockados — nenhum DB/Asaas real.
 *
 * Contrato exigido:
 *  - PAYMENT_CONFIRMED nao altera status, vencimento, desconto nem recompensa;
 *  - PAYMENT_RECEIVED ativa e credita uma unica vez;
 *  - retry (mesmo event id) e segundo event id do MESMO pagamento nao duplicam
 *    extensao nem recompensa;
 *  - falha de sincronizacao no Asaas devolve 500 para o Asaas reentregar.
 */

const SECRET = "segredo-de-teste";

jest.mock("@/lib/db", () => ({
  prisma: {
    empresa: { findUnique: jest.fn(), update: jest.fn() },
    memberLink: { findUnique: jest.fn() },
    memberConversion: { count: jest.fn(), findUnique: jest.fn() },
    $transaction: jest.fn(),
  },
}));

jest.mock("@/lib/asaas", () => ({
  asaas: {
    getSubscription: jest.fn(),
    updateSubscriptionDueDate: jest.fn(),
    updateSubscriptionValue: jest.fn(),
    listPaymentHistory: jest.fn(),
    getPayment: jest.fn(),
  },
}));

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { asaas } from "@/lib/asaas";
import { POST } from "@/app/api/webhooks/asaas/route";

const prismaMock = prisma as unknown as {
  empresa: { findUnique: jest.Mock; update: jest.Mock };
  memberLink: { findUnique: jest.Mock };
  memberConversion: { count: jest.Mock; findUnique: jest.Mock };
  $transaction: jest.Mock;
};
const asaasMock = asaas as unknown as {
  getSubscription: jest.Mock;
  updateSubscriptionDueDate: jest.Mock;
  updateSubscriptionValue: jest.Mock;
  getPayment: jest.Mock;
};

const empresaBase = {
  id: "E1",
  asaasCustomerId: "cus_1",
  asaasSubscriptionId: "sub_1",
  status: "ATIVO",
  vencimentoPlano: new Date("2026-06-10T00:00:00.000Z"),
  webhookEventId: null as string | null,
};

function txMock(claimCount = 1, conversao: unknown = null) {
  return {
    empresa: {
      updateMany: jest.fn().mockResolvedValue({ count: claimCount }),
      findUnique: jest
        .fn()
        .mockResolvedValue({ vencimentoPlano: new Date("2026-06-10T00:00:00.000Z") }),
    },
    memberConversion: {
      findUnique: jest.fn().mockResolvedValue(conversao),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      count: jest.fn().mockResolvedValue(0),
      update: jest.fn().mockResolvedValue({}),
    },
    memberLink: {
      findUnique: jest.fn().mockResolvedValue(null),
    },
    $queryRaw: jest.fn().mockResolvedValue([]),
  };
}

function req(event: string, over: Record<string, unknown> = {}, id = "evt_1") {
  return new NextRequest("http://localhost/api/webhooks/asaas", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "asaas-access-token": SECRET,
    },
    body: JSON.stringify({
      id,
      event,
      payment: {
        id: "pay_1",
        customer: "cus_1",
        subscription: "sub_1",
        value: 49.9,
        dueDate: "2026-11-10",
        ...over,
      },
    }),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  process.env.ASAAS_WEBHOOK_SECRET = SECRET;
  prismaMock.empresa.findUnique.mockResolvedValue({ ...empresaBase });
  prismaMock.empresa.update.mockResolvedValue({});
  prismaMock.memberLink.findUnique.mockResolvedValue(null);
  prismaMock.memberConversion.count.mockResolvedValue(0);
  prismaMock.memberConversion.findUnique.mockResolvedValue(null);
  prismaMock.$transaction.mockImplementation(async (cb: any) => cb(txMock()));
  asaasMock.getPayment.mockReset();
});

describe("webhook Asaas: PAYMENT_CONFIRMED nao credita", () => {
  it("CONFIRMED nao altera status, vencimento, desconto nem recompensa", async () => {
    const res = await POST(req("PAYMENT_CONFIRMED"));

    expect(res.status).toBe(200);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
    expect(prismaMock.empresa.update).not.toHaveBeenCalled();
    expect(prismaMock.empresa.findUnique).toHaveBeenCalledTimes(1);
    expect(asaasMock.updateSubscriptionDueDate).not.toHaveBeenCalled();
    expect(asaasMock.updateSubscriptionValue).not.toHaveBeenCalled();
  });

  it("CONFIRMED com mesmo event id de um RECEIVED anterior continua sem credito", async () => {
    prismaMock.empresa.findUnique.mockResolvedValue({
      ...empresaBase,
      webhookEventId: "evt_recebido",
    });

    const res = await POST(req("PAYMENT_CONFIRMED", {}, "evt_outro"));

    expect(res.status).toBe(200);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });
});

describe("webhook Asaas: PAYMENT_RECEIVED credita uma vez", () => {
  it("ativa o plano e grava o evento", async () => {
    const tx = txMock();
    prismaMock.$transaction.mockImplementation(async (cb: any) => cb(tx));

    const res = await POST(req("PAYMENT_RECEIVED"));

    expect(res.status).toBe(200);
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    const claim = tx.empresa.updateMany.mock.calls[0][0];
    expect(claim.data.status).toBe("ATIVO");
    expect(claim.data.vencimentoPlano).toEqual(
      new Date("2026-12-10T00:00:00.000Z"),
    );
  });

  it("retry com o mesmo event id nao reprocessa", async () => {
    prismaMock.empresa.findUnique.mockResolvedValue({
      ...empresaBase,
      webhookEventId: "evt_1",
    });

    const res = await POST(req("PAYMENT_RECEIVED", {}, "evt_1"));
    const body = await res.json();

    expect(body.message).toBe("Event already processed");
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("segundo event id do MESMO pagamento nao estende de novo", async () => {
    // cobertura ja vigente (dueDate 2026-11-10 = mesmo alvo de antes)
    prismaMock.empresa.findUnique.mockResolvedValue({
      ...empresaBase,
      vencimentoPlano: new Date("2026-12-10T00:00:00.000Z"),
      webhookEventId: "evt_1",
    });

    const res = await POST(req("PAYMENT_RECEIVED", {}, "evt_2"));
    const body = await res.json();

    expect(body.message).toBe("Cobertura ja vigente");
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("claim perdido (corrida) nao aplica recompensa", async () => {
    const tx = txMock(0);
    prismaMock.$transaction.mockImplementation(async (cb: any) => cb(tx));

    const res = await POST(req("PAYMENT_RECEIVED"));

    expect(res.status).toBe(200);
    expect(tx.memberConversion.findUnique).not.toHaveBeenCalled();
  });

  it("SUBPAGAMENTO (R$0,01) nao credita plano", async () => {
    const res = await POST(req("PAYMENT_RECEIVED", { value: 0.01 }));

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ message: "Pagamento recusado" });
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("RECEIVED sem dueDate sem resolucao do Asaas: 500, sem credito", async () => {
    asaasMock.getPayment.mockResolvedValue(null);

    const res = await POST(req("PAYMENT_RECEIVED", { dueDate: null }));
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe("Pagamento sem dueDate");
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("getPayment recupera dueDate valido e credita (rejeicao transitoria resolvida)", async () => {
    asaasMock.getPayment.mockResolvedValue({
      id: "pay_1",
      customer: "cus_1",
      subscription: "sub_1",
      value: 49.9,
      dueDate: "2026-11-10",
    });
    const tx = txMock();
    prismaMock.$transaction.mockImplementation(async (cb: any) => cb(tx));

    const res = await POST(req("PAYMENT_RECEIVED", { dueDate: null }));

    expect(res.status).toBe(200);
    expect(asaasMock.getPayment).toHaveBeenCalledWith("pay_1");
    const claim = tx.empresa.updateMany.mock.calls[0][0];
    expect(claim.data.vencimentoPlano).toEqual(
      new Date("2026-12-10T00:00:00.000Z"),
    );
  });

  it("getPayment nao resolve ciclo (null): 500, sem credito, sem marcador", async () => {
    asaasMock.getPayment.mockResolvedValue(null);

    const res = await POST(req("PAYMENT_RECEIVED", { dueDate: null }));
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe("Pagamento sem dueDate");
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
    expect(prismaMock.empresa.update).not.toHaveBeenCalled();
  });
});

describe("webhook Asaas: MGM aplicado no RECEIVED, sem coluna nova", () => {
  function comIndicacao() {
    const tx = txMock(1, { id: "C_NOVA", linkId: "L1" });
    tx.memberConversion.count
      .mockResolvedValueOnce(3) // pagas do link
      .mockResolvedValueOnce(0); // mesGratisGerado: nenhum ainda
    tx.memberLink.findUnique.mockResolvedValue({ id: "L1", empresaId: "E_IND" });
    prismaMock.$transaction.mockImplementation(async (cb: any) => cb(tx));

    // pos-commit: reconciliar beneficios do indicador
    prismaMock.memberConversion.findUnique.mockResolvedValue({
      link: { empresaId: "E_IND" },
    });
    prismaMock.memberLink.findUnique.mockImplementation(async ({ where }: any) =>
      where.empresaId === "E_IND" ? { id: "L1" } : null,
    );
    prismaMock.memberConversion.count
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(1);
    prismaMock.empresa.findUnique
      .mockResolvedValueOnce({ ...empresaBase })
      .mockResolvedValueOnce({
        asaasSubscriptionId: "sub_1",
        vencimentoPlano: new Date("2026-07-10T00:00:00.000Z"),
      });
    asaasMock.getSubscription.mockResolvedValue({
      nextDueDate: "2026-06-20",
      value: 49.9,
    });
    asaasMock.updateSubscriptionDueDate.mockResolvedValue(true);
    asaasMock.updateSubscriptionValue.mockResolvedValue(true);
    return tx;
  }

  it("empurra o mes gratis para o proximo ciclo da assinatura", async () => {
    comIndicacao();

    const res = await POST(req("PAYMENT_RECEIVED"));

    expect(res.status).toBe(200);
    expect(asaasMock.updateSubscriptionDueDate).toHaveBeenCalledWith(
      "sub_1",
      new Date("2026-07-10T00:00:00.000Z"),
    );
  });

  it("falha do Asaas devolve 500 para o Asaas reentregar (retry idempotente)", async () => {
    comIndicacao();
    asaasMock.updateSubscriptionDueDate.mockRejectedValue(
      new Error("Asaas fora do ar"),
    );

    const res = await POST(req("PAYMENT_RECEIVED"));

    expect(res.status).toBe(500);
  });
});

describe("webhook Asaas: reentrega re-sincroniza o beneficio MGM (P0)", () => {
  /** Fatura paga em 2026-06-10 => cobertura 2026-12-10 depois do credito. */
  const VENC_ANTES_DO_CREDITO = new Date("2026-06-10T00:00:00.000Z");
  const VENC_DEPOIS_DO_CREDITO = new Date("2026-12-10T00:00:00.000Z");
  const VENC_INDICADOR = new Date("2026-07-10T00:00:00.000Z");

  function cenarioMgm(estado: {
    vencimentoPlano: Date;
    webhookEventId: string | null;
  }) {
    // Empresa convertida (busca por customer) vs. estado lido pela sync (por id).
    prismaMock.empresa.findUnique.mockImplementation(async ({ where }: any) =>
      where.asaasCustomerId
        ? { ...empresaBase, ...estado }
        : { asaasSubscriptionId: "sub_1", vencimentoPlano: VENC_INDICADOR },
    );
    prismaMock.memberConversion.findUnique.mockResolvedValue({
      link: { empresaId: "E_IND" },
    });
    prismaMock.memberLink.findUnique.mockImplementation(async ({ where }: any) =>
      where.empresaId === "E_IND" ? { id: "L1" } : null,
    );
    // pagas=1 e mesGratisGerado=1: beneficio devido, mes gratis a empurrar.
    prismaMock.memberConversion.count.mockResolvedValue(1);
    asaasMock.getSubscription.mockResolvedValue({
      nextDueDate: "2026-06-20",
      value: 49.9,
    });
    asaasMock.updateSubscriptionDueDate.mockResolvedValue(true);
  }

  it("1a entrega falha no Asaas -> 500; reentrega do mesmo evento re-sincroniza e devolve 200 sem novo credito", async () => {
    const tx = txMock();
    prismaMock.$transaction.mockImplementation(async (cb: any) => cb(tx));
    cenarioMgm({ vencimentoPlano: VENC_ANTES_DO_CREDITO, webhookEventId: null });
    asaasMock.updateSubscriptionDueDate.mockRejectedValueOnce(
      new Error("Asaas fora do ar"),
    );

    const primeira = await POST(req("PAYMENT_RECEIVED", {}, "evt_1"));

    expect(primeira.status).toBe(500);
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.empresa.updateMany).toHaveBeenCalledTimes(1);
    expect(asaasMock.updateSubscriptionDueDate).toHaveBeenCalledTimes(1);

    // A 1a entrega JA commitou (o credito e anterior a falha externa). O retry
    // do Asaas chega com o mesmo event id gravado e o vencimento ja avancado.
    cenarioMgm({
      vencimentoPlano: VENC_DEPOIS_DO_CREDITO,
      webhookEventId: "evt_1",
    });

    const retry = await POST(req("PAYMENT_RECEIVED", {}, "evt_1"));
    const body = await retry.json();

    expect(retry.status).toBe(200);
    expect(body.message).toBe("Event already processed");
    // Uma unica transacao/credito, um unico vencimento-alvo.
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.empresa.updateMany).toHaveBeenCalledTimes(1);
    expect(
      tx.empresa.updateMany.mock.calls[0][0].data.vencimentoPlano,
    ).toEqual(VENC_DEPOIS_DO_CREDITO);
    // O beneficio foi re-sincronizado no retry (e nao duplicado).
    expect(asaasMock.getSubscription).toHaveBeenCalledTimes(2);
    expect(asaasMock.updateSubscriptionDueDate).toHaveBeenCalledTimes(2);
  });

  it("reentrega de evento ja processado com sucesso re-sincroniza e nao credita de novo", async () => {
    const tx = txMock();
    prismaMock.$transaction.mockImplementation(async (cb: any) => cb(tx));
    cenarioMgm({ vencimentoPlano: VENC_ANTES_DO_CREDITO, webhookEventId: null });

    const primeira = await POST(req("PAYMENT_RECEIVED", {}, "evt_1"));
    expect(primeira.status).toBe(200);
    expect(asaasMock.updateSubscriptionDueDate).toHaveBeenCalledTimes(1);

    cenarioMgm({
      vencimentoPlano: VENC_DEPOIS_DO_CREDITO,
      webhookEventId: "evt_1",
    });

    const retry = await POST(req("PAYMENT_RECEIVED", {}, "evt_1"));
    expect(retry.status).toBe(200);
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.empresa.updateMany).toHaveBeenCalledTimes(1);
    // Sync rodou de novo (leitura da assinatura), sem segunda transacao.
    expect(asaasMock.getSubscription).toHaveBeenCalledTimes(2);
  });
});

describe("webhook Asaas: PAYMENT_OVERDUE respeita a cobertura efetiva", () => {
  function dia(offset: number) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + offset);
    return d.toISOString();
  }

  function pausou() {
    return prismaMock.empresa.update.mock.calls.some(
      ([args]: any[]) => args.data.status === "PAUSADO",
    );
  }

  it("evento de ciclo ANTIGO com vencimento ainda coberto nao pausa", async () => {
    prismaMock.empresa.findUnique.mockResolvedValue({
      ...empresaBase,
      vencimentoPlano: new Date(dia(30)),
    });

    const res = await POST(
      req("PAYMENT_OVERDUE", { dueDate: dia(-60).slice(0, 10) }, "evt_od_antigo"),
    );

    expect(res.status).toBe(200);
    expect(pausou()).toBe(false);
    // Registra o evento sem tocar no status.
    expect(prismaMock.empresa.update).toHaveBeenCalledTimes(1);
    expect(prismaMock.empresa.update.mock.calls[0][0].data).toEqual({
      webhookEventId: "evt_od_antigo",
    });
  });

  it("cobertura realmente vencida alem da tolerancia pausa", async () => {
    prismaMock.empresa.findUnique.mockResolvedValue({
      ...empresaBase,
      status: "ATIVO",
      // Cobertura termina no MESMO dia da fatura nao paga (o ciclo seguinte).
      vencimentoPlano: new Date(dia(-40).slice(0, 10)),
    });

    const res = await POST(
      req("PAYMENT_OVERDUE", { dueDate: dia(-40).slice(0, 10) }, "evt_od_vencido"),
    );

    expect(res.status).toBe(200);
    expect(pausou()).toBe(true);
    expect(prismaMock.empresa.update).toHaveBeenCalledTimes(1);
    expect(prismaMock.empresa.update.mock.calls[0][0].data).toEqual({
      status: "PAUSADO",
      webhookEventId: "evt_od_vencido",
    });
  });

  it("overdue sem vencimento local usa o dueDate da fatura", async () => {
    prismaMock.empresa.findUnique.mockResolvedValue({
      ...empresaBase,
      vencimentoPlano: null,
    });

    const res = await POST(
      req("PAYMENT_OVERDUE", { dueDate: dia(-40).slice(0, 10) }, "evt_od_sem_venc"),
    );

    expect(res.status).toBe(200);
    expect(pausou()).toBe(true);
  });
});

describe("webhook Asaas: seguranca", () => {
  it("token invalido: 401", async () => {
    const r = new NextRequest("http://localhost/api/webhooks/asaas", {
      method: "POST",
      headers: { "asaas-access-token": "errado" },
      body: JSON.stringify({ event: "PAYMENT_RECEIVED" }),
    });

    const res = await POST(r);
    expect(res.status).toBe(401);
  });

  it("customer desconhecido: 200 sem processar", async () => {
    prismaMock.empresa.findUnique.mockResolvedValue(null);

    const res = await POST(req("PAYMENT_RECEIVED"));
    expect(res.status).toBe(200);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });
});
