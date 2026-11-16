/**
 * @jest-environment node
 *
 * Confirmacao do vinculo Asaas (`lib/master-asaas.ts` -> `aplicarConfirmacao`).
 *
 * E a UNICA porta de escrita. Prova:
 *  - token invalido/expirado/divergente => 409 e zero escrita (replay seguro);
 *  - revalidacao: preview obsoleto nunca escreve;
 *  - ACTIVE sem RECEIVED nao libera; RECEIVED comprovado promove;
 *  - INACTIVE -> PAUSADO; terminal so com `confirmarTerminal`;
 *  - provisionamento: reconsulta antes de criar e claim evita duplicar;
 *  - timeout do POST nao duplica (reconsulta acha a assinatura criada).
 *
 * Todos os externos mockados. Nenhuma conexao real, banco ou Asaas.
 */
jest.mock("@/lib/db", () => ({
  prisma: {
    empresa: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    user: { findFirst: jest.fn() },
    cupom: { findUnique: jest.fn() },
  },
}));

jest.mock("@/lib/asaas", () => ({
  asaas: {
    getCustomer: jest.fn(),
    buscarCustomerPorCpfCnpj: jest.fn(),
    getSubscription: jest.fn(),
    listSubscriptionsByCustomer: jest.fn(),
    listPaymentHistory: jest.fn(),
    createCustomer: jest.fn(),
    createSubscription: jest.fn(),
    updateSubscriptionDueDate: jest.fn(),
    pauseSubscription: jest.fn(),
    reactivateSubscription: jest.fn(),
  },
}));

import { prisma } from "@/lib/db";
import { asaas } from "@/lib/asaas";
import { aplicarConfirmacao, montarPreview } from "@/lib/master-asaas";

const AGORA = new Date("2026-11-15T12:00:00.000Z");

const findUniqueMock = prisma.empresa.findUnique as jest.Mock;
const findFirstMock = prisma.empresa.findFirst as jest.Mock;
const updateMock = prisma.empresa.update as jest.Mock;
const updateManyMock = prisma.empresa.updateMany as jest.Mock;
const userFindMock = prisma.user.findFirst as jest.Mock;

const getCustomerMock = asaas.getCustomer as jest.Mock;
const buscarCustomerMock = asaas.buscarCustomerPorCpfCnpj as jest.Mock;
const getSubscriptionMock = asaas.getSubscription as jest.Mock;
const listSubsMock = asaas.listSubscriptionsByCustomer as jest.Mock;
const listHistoryMock = asaas.listPaymentHistory as jest.Mock;
const createCustomerMock = asaas.createCustomer as jest.Mock;
const createSubscriptionMock = asaas.createSubscription as jest.Mock;

function empresaVinculada(over: Record<string, unknown> = {}) {
  return {
    id: "E1",
    nome: "Empresa 1",
    status: "EM_TESTE",
    // Trial ainda vigente: o status nao pode cair por vencimento cru.
    vencimentoPlano: new Date("2026-11-20T00:00:00.000Z"),
    asaasCustomerId: "cus_E1",
    asaasSubscriptionId: "sub_E1",
    cpfCnpj: "12345678000199",
    telefone: null,
    ciclo: "MENSAL",
    cupomAplicado: null,
    enderecoLogradouro: null,
    enderecoNumero: null,
    enderecoBairro: null,
    enderecoCep: null,
    ...over,
  };
}

function empresaSemVinculo(over: Record<string, unknown> = {}) {
  return empresaVinculada({
    asaasCustomerId: null,
    asaasSubscriptionId: null,
    status: "PENDENTE",
    ...over,
  });
}

function sub(over: Record<string, unknown> = {}) {
  return {
    id: "sub_E1",
    status: "ACTIVE",
    customerId: "cus_E1",
    value: 49.9,
    cycle: "MONTHLY",
    nextDueDate: "2026-12-10",
    ...over,
  };
}

function pagamentoRecebido() {
  return [
    {
      status: "RECEIVED",
      value: 49.9,
      dueDate: "2026-11-15",
      customer: "cus_E1",
      subscription: "sub_E1",
    },
  ];
}

async function tokenAtual(empresaId = "E1"): Promise<string> {
  const p = await montarPreview(empresaId, AGORA);
  if (!p.ok) throw new Error(`preview falhou: ${p.erro}`);
  return p.preview.token;
}

beforeEach(() => {
  jest.clearAllMocks();
  process.env.MASTER_PREVIEW_SECRET = "segredo-preview";
  delete process.env.ASAAS_WEBHOOK_SECRET;

  userFindMock.mockResolvedValue({ email: "admin@empresa.com" });
  findFirstMock.mockResolvedValue(null);
  getCustomerMock.mockResolvedValue({ id: "cus_E1" });
  buscarCustomerMock.mockResolvedValue({ ok: true, customer: null });
  listSubsMock.mockResolvedValue([]);
  listHistoryMock.mockResolvedValue([]);
  updateManyMock.mockResolvedValue({ count: 1 });
  updateMock.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
    id: "E1",
    status: (data.status as string) ?? "EM_TESTE",
    vencimentoPlano: (data.vencimentoPlano as Date) ?? null,
  }));
});

describe("revalidacao do preview", () => {
  it("token ausente/adulterado: 409 sem escrita", async () => {
    findUniqueMock.mockResolvedValue(empresaVinculada());
    getSubscriptionMock.mockResolvedValue(sub());

    for (const token of [null, "lixo", "a.b"]) {
      const r = await aplicarConfirmacao({ empresaId: "E1", token, agora: AGORA });
      expect(r.http).toBe(409);
      expect(r.body.erro).toBe("preview_invalido");
    }
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("preview obsoleto (estado mudou): 409 divergente sem escrita", async () => {
    findUniqueMock.mockResolvedValue(empresaVinculada());
    getSubscriptionMock.mockResolvedValue(sub());

    const token = await tokenAtual();

    // Estado muda depois do preview: assinatura vai para INACTIVE.
    getSubscriptionMock.mockResolvedValue(sub({ status: "INACTIVE" }));

    const r = await aplicarConfirmacao({ empresaId: "E1", token, agora: AGORA });

    expect(r.http).toBe(409);
    expect(r.body.erro).toBe("preview_invalido");
    expect(r.body.motivo).toBe("divergente");
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("replay apos aplicar: segunda chamada com mesmo token nao reescreve", async () => {
    findUniqueMock.mockResolvedValue(empresaVinculada());
    getSubscriptionMock.mockResolvedValue(sub());
    listHistoryMock.mockResolvedValue(pagamentoRecebido());

    const token = await tokenAtual();
    const primeira = await aplicarConfirmacao({ empresaId: "E1", token, agora: AGORA });
    expect(primeira.http).toBe(200);
    expect(updateMock).toHaveBeenCalledTimes(1);

    // Depois da escrita o estado local ja e ATIVO: o snapshot muda.
    findUniqueMock.mockResolvedValue(
      empresaVinculada({
        status: "ATIVO",
        vencimentoPlano: new Date("2026-12-15T00:00:00.000Z"),
      }),
    );

    const segunda = await aplicarConfirmacao({ empresaId: "E1", token, agora: AGORA });
    expect(segunda.http).toBe(409);
    expect(updateMock).toHaveBeenCalledTimes(1);
  });
});

describe("confirmacao de empresa vinculada", () => {
  it("ACTIVE sem RECEIVED: nao promove e nao escreve", async () => {
    findUniqueMock.mockResolvedValue(empresaVinculada());
    getSubscriptionMock.mockResolvedValue(sub());
    listHistoryMock.mockResolvedValue([]);

    const token = await tokenAtual();
    const r = await aplicarConfirmacao({ empresaId: "E1", token, agora: AGORA });

    expect(r.http).toBe(200);
    expect(r.body.aplicado).toBe(false);
    expect(r.body.statusFinal).toBe("EM_TESTE");
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("RECEIVED comprovado promove EM_TESTE -> ATIVO", async () => {
    findUniqueMock.mockResolvedValue(empresaVinculada());
    getSubscriptionMock.mockResolvedValue(sub());
    listHistoryMock.mockResolvedValue(pagamentoRecebido());

    const token = await tokenAtual();
    const r = await aplicarConfirmacao({ empresaId: "E1", token, agora: AGORA });

    expect(r.http).toBe(200);
    expect(r.body.aplicado).toBe(true);
    expect(r.body.statusFinal).toBe("ATIVO");
    expect(updateMock).toHaveBeenCalledTimes(1);
    expect(updateMock.mock.calls[0][0].data.status).toBe("ATIVO");
  });

  it("INACTIVE vira PAUSADO", async () => {
    findUniqueMock.mockResolvedValue(empresaVinculada({ status: "ATIVO" }));
    getSubscriptionMock.mockResolvedValue(sub({ status: "INACTIVE" }));

    const token = await tokenAtual();
    const r = await aplicarConfirmacao({ empresaId: "E1", token, agora: AGORA });

    expect(r.http).toBe(200);
    expect(r.body.statusFinal).toBe("PAUSADO");
    expect(updateMock.mock.calls[0][0].data.status).toBe("PAUSADO");
  });

  it("CANCELLED sem confirmarTerminal: 409 e nenhuma escrita", async () => {
    findUniqueMock.mockResolvedValue(empresaVinculada({ status: "ATIVO" }));
    getSubscriptionMock.mockResolvedValue(sub({ status: "CANCELLED" }));

    const token = await tokenAtual();
    const r = await aplicarConfirmacao({ empresaId: "E1", token, agora: AGORA });

    expect(r.http).toBe(409);
    expect(r.body.erro).toBe("confirmacao_terminal_necessaria");
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("CANCELLED com confirmarTerminal: cancela explicitamente", async () => {
    findUniqueMock.mockResolvedValue(empresaVinculada({ status: "ATIVO" }));
    getSubscriptionMock.mockResolvedValue(sub({ status: "CANCELLED" }));

    const token = await tokenAtual();
    const r = await aplicarConfirmacao({
      empresaId: "E1",
      token,
      confirmarTerminal: true,
      agora: AGORA,
    });

    expect(r.http).toBe(200);
    expect(r.body.statusFinal).toBe("CANCELADO");
    expect(updateMock.mock.calls[0][0].data.status).toBe("CANCELADO");
  });
});

describe("confirmacao de provisionamento", () => {
  it("0 assinaturas sem confirmarTermos: 409 confirmacao_termos_necessaria", async () => {
    findUniqueMock.mockResolvedValue(empresaSemVinculo());
    buscarCustomerMock.mockResolvedValue({ ok: true, customer: null });
    listSubsMock.mockResolvedValue([]);

    const token = await tokenAtual();
    const r = await aplicarConfirmacao({ empresaId: "E1", token, agora: AGORA });

    expect(r.http).toBe(409);
    expect(r.body.erro).toBe("confirmacao_termos_necessaria");
    expect(createCustomerMock).not.toHaveBeenCalled();
    expect(createSubscriptionMock).not.toHaveBeenCalled();
  });

  it("0 assinaturas: cria customer + assinatura, vincula e nao libera acesso", async () => {
    findUniqueMock.mockResolvedValue(empresaSemVinculo());
    buscarCustomerMock.mockResolvedValue({ ok: true, customer: null });
    listSubsMock.mockResolvedValue([]);
    createCustomerMock.mockResolvedValue({ id: "cus_novo" });
    createSubscriptionMock.mockResolvedValue({ id: "sub_nova" });
    listHistoryMock.mockResolvedValue([]);

    const token = await tokenAtual();
    const r = await aplicarConfirmacao({
      empresaId: "E1",
      token,
      confirmarTermos: true,
      agora: AGORA,
    });

    expect(r.http).toBe(200);
    expect(r.body.criouCustomer).toBe(true);
    expect(r.body.criouAssinatura).toBe(true);
    expect(r.body.pagamentoComprovado).toBe(false);
    expect(createCustomerMock).toHaveBeenCalledTimes(1);
    expect(createSubscriptionMock).toHaveBeenCalledTimes(1);
    expect(updateMock.mock.calls[0][0].data.status).toBe("PENDENTE");

    // Claims travam customer e assinatura (idempotencia).
    expect(updateManyMock).toHaveBeenCalledTimes(2);
  });

  it("timeout do POST nao duplica: reconsulta acha a assinatura criada", async () => {
    findUniqueMock.mockResolvedValue(empresaSemVinculo());
    buscarCustomerMock.mockResolvedValue({ ok: true, customer: { id: "cus_E1" } });
    // preview: 0; reconsulta antes do POST: 0; apos o POST com erro: 1.
    listSubsMock
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { id: "sub_unica", status: "ACTIVE", customerId: "cus_E1", value: 49.9, cycle: "MONTHLY" },
      ]);
    createSubscriptionMock.mockRejectedValue(new Error("timeout"));
    listHistoryMock.mockResolvedValue([]);

    const token = await tokenAtual();
    const r = await aplicarConfirmacao({
      empresaId: "E1",
      token,
      confirmarTermos: true,
      agora: AGORA,
    });

    expect(r.http).toBe(200);
    expect(r.body.criouAssinatura).toBe(false);
    // Uma unica tentativa de POST, nenhuma duplicacao.
    expect(createSubscriptionMock).toHaveBeenCalledTimes(1);
    expect(updateManyMock).toHaveBeenCalledTimes(2); // customer + assinatura
  });

  it("claim perdido (outra execucao vinculou antes): 409 sem escrita", async () => {
    findUniqueMock.mockResolvedValue(empresaSemVinculo());
    buscarCustomerMock.mockResolvedValue({ ok: true, customer: { id: "cus_E1" } });
    listSubsMock.mockResolvedValue([
      { id: "sub_existente", status: "ACTIVE", customerId: "cus_E1", value: 49.9, cycle: "MONTHLY" },
    ]);
    listHistoryMock.mockResolvedValue([]);
    updateManyMock
      .mockResolvedValueOnce({ count: 1 }) // claim do customer
      .mockResolvedValueOnce({ count: 0 }); // claim da assinatura perdido

    const token = await tokenAtual();
    const r = await aplicarConfirmacao({ empresaId: "E1", token, agora: AGORA });

    expect(r.http).toBe(409);
    expect(r.body.erro).toBe("conflito_vinculo");
    expect(r.body.motivo).toBe("assinatura_ja_vinculada_por_outra_execucao");
    expect(createSubscriptionMock).not.toHaveBeenCalled();
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("modo conflito no preview: confirm recusa 409", async () => {
    findUniqueMock.mockResolvedValue(empresaSemVinculo());
    buscarCustomerMock.mockResolvedValue({ ok: true, customer: { id: "cus_E1" } });
    listSubsMock.mockResolvedValue([
      { id: "sub_a", status: "ACTIVE", customerId: "cus_E1" },
      { id: "sub_b", status: "ACTIVE", customerId: "cus_E1" },
    ]);

    const token = await tokenAtual();
    const r = await aplicarConfirmacao({ empresaId: "E1", token, agora: AGORA });

    expect(r.http).toBe(409);
    expect(r.body.erro).toBe("conflito_vinculo");
    expect(createSubscriptionMock).not.toHaveBeenCalled();
    expect(updateMock).not.toHaveBeenCalled();
  });
});
