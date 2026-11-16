/**
 * @jest-environment node
 *
 * Preview do vinculo Asaas (`lib/master-asaas.ts` -> `montarPreview`).
 *
 * Contrato provado aqui:
 *  - preview NUNCA escreve: zero create/update no Asaas e zero escrita no DB;
 *  - ACTIVE sozinho nao libera acesso; so PAYMENT_RECEIVED provado promove;
 *  - INACTIVE pausa; CANCELLED nao aplica terminal sem confirmacao;
 *  - falha de busca no Asaas e fail-closed (nao vira "nao existe");
 *  - 0 / 1 / >1 assinaturas e customer de outra empresa tem tratamento distinto.
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
import { montarPreview } from "@/lib/master-asaas";

const AGORA = new Date("2026-11-15T12:00:00.000Z");

const findUniqueMock = prisma.empresa.findUnique as jest.Mock;
const findFirstMock = prisma.empresa.findFirst as jest.Mock;
const updateMock = prisma.empresa.update as jest.Mock;
const updateManyMock = prisma.empresa.updateMany as jest.Mock;
const userFindMock = prisma.user.findFirst as jest.Mock;
const cupomMock = prisma.cupom.findUnique as jest.Mock;

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

function pagamentoRecebido(sub = "sub_E1", cus = "cus_E1") {
  return [
    {
      status: "RECEIVED",
      value: 49.9,
      dueDate: "2026-11-15",
      customer: cus,
      subscription: sub,
    },
  ];
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
  cupomMock.mockResolvedValue(null);
  createCustomerMock.mockResolvedValue({ id: "cus_novo" });
  createSubscriptionMock.mockResolvedValue({ id: "sub_nova" });
});

describe("preview de empresa vinculada", () => {
  it("ACTIVE sem RECEIVED nao libera acesso e nao escreve nada", async () => {
    findUniqueMock.mockResolvedValue(empresaVinculada());
    getSubscriptionMock.mockResolvedValue({
      id: "sub_E1",
      status: "ACTIVE",
      customerId: "cus_E1",
      value: 49.9,
      cycle: "MONTHLY",
      nextDueDate: "2026-12-10",
    });
    listHistoryMock.mockResolvedValue([]);

    const r = await montarPreview("E1", AGORA);

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.preview.modo).toBe("vinculada");
    expect(r.preview.proposta.statusProposto).toBe("EM_TESTE");
    expect(r.preview.proposta.liberaAcesso).toBe(false);
    expect(r.preview.asaas.pagamento.recebido).toBe(false);

    // Zero escrita: preview e somente leitura.
    expect(updateMock).not.toHaveBeenCalled();
    expect(updateManyMock).not.toHaveBeenCalled();
    expect(createCustomerMock).not.toHaveBeenCalled();
    expect(createSubscriptionMock).not.toHaveBeenCalled();
  });

  it("RECEIVED comprovado promove EM_TESTE -> ATIVO", async () => {
    findUniqueMock.mockResolvedValue(empresaVinculada());
    getSubscriptionMock.mockResolvedValue({
      id: "sub_E1",
      status: "ACTIVE",
      customerId: "cus_E1",
      value: 49.9,
      cycle: "MONTHLY",
      nextDueDate: "2026-12-10",
    });
    listHistoryMock.mockResolvedValue(pagamentoRecebido());

    const r = await montarPreview("E1", AGORA);

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.preview.proposta.statusProposto).toBe("ATIVO");
    expect(r.preview.proposta.liberaAcesso).toBe(true);
    expect(r.preview.asaas.pagamento.recebido).toBe(true);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("INACTIVE vira PAUSADO (nunca CANCELADO)", async () => {
    findUniqueMock.mockResolvedValue(empresaVinculada({ status: "ATIVO" }));
    getSubscriptionMock.mockResolvedValue({
      id: "sub_E1",
      status: "INACTIVE",
      customerId: "cus_E1",
      value: 49.9,
      cycle: "MONTHLY",
      nextDueDate: "2026-12-10",
    });
    listHistoryMock.mockResolvedValue([]);

    const r = await montarPreview("E1", AGORA);

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.preview.proposta.statusProposto).toBe("PAUSADO");
    expect(r.preview.proposta.requerConfirmacaoTerminal).toBe(false);
    expect(r.preview.proposta.liberaAcesso).toBe(false);
  });

  it("CANCELLED pede confirmacao terminal e nao cancela no preview", async () => {
    findUniqueMock.mockResolvedValue(empresaVinculada({ status: "ATIVO" }));
    getSubscriptionMock.mockResolvedValue({
      id: "sub_E1",
      status: "CANCELLED",
      customerId: "cus_E1",
      value: 49.9,
      cycle: "MONTHLY",
      nextDueDate: "2026-12-10",
    });
    listHistoryMock.mockResolvedValue([]);

    const r = await montarPreview("E1", AGORA);

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.preview.proposta.requerConfirmacaoTerminal).toBe(true);
    expect(r.preview.proposta.statusAsaasTerminal).toBe(true);
    // Sem a flag, o status atual e preservado.
    expect(r.preview.proposta.statusProposto).toBe("ATIVO");
    expect(r.preview.avisos.length).toBeGreaterThan(0);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("historico indisponivel (null) fica pendente e nao promove", async () => {
    findUniqueMock.mockResolvedValue(empresaVinculada());
    getSubscriptionMock.mockResolvedValue({
      id: "sub_E1",
      status: "ACTIVE",
      customerId: "cus_E1",
      value: 49.9,
      cycle: "MONTHLY",
      nextDueDate: "2026-12-10",
    });
    listHistoryMock.mockResolvedValue(null);

    const r = await montarPreview("E1", AGORA);

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.preview.asaas.pagamento.pendente).toBe(true);
    expect(r.preview.proposta.liberaAcesso).toBe(false);
  });
});

describe("preview de empresa sem vinculo", () => {
  it("falha na busca por cpfCnpj e fail-closed (nao cria)", async () => {
    findUniqueMock.mockResolvedValue(empresaSemVinculo());
    buscarCustomerMock.mockResolvedValue({ ok: false });

    const r = await montarPreview("E1", AGORA);

    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.http).toBe(502);
    expect(r.erro).toBe("falha_consulta_asaas");
    expect(createCustomerMock).not.toHaveBeenCalled();
    expect(createSubscriptionMock).not.toHaveBeenCalled();
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("customer novo + 0 assinaturas: informa criacao sem escrever", async () => {
    findUniqueMock.mockResolvedValue(empresaSemVinculo());
    buscarCustomerMock.mockResolvedValue({ ok: true, customer: null });

    const r = await montarPreview("E1", AGORA);

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.preview.modo).toBe("provisionamento");
    expect(r.preview.proposta.acao).toBe("criar_assinatura");
    expect(r.preview.provisionamento).toBeDefined();
    expect(r.preview.provisionamento?.criarCustomer).toBe(true);
    expect(r.preview.provisionamento?.criarAssinatura).toBe(true);
    expect(r.preview.provisionamento?.valor).toBe(49.9);
    expect(r.preview.provisionamento?.ciclo).toBe("MONTHLY");
    // Primeiro vencimento nunca retroativo (hoje ou futuro).
    expect(
      (r.preview.provisionamento?.primeiroVencimento ?? "") >= "2026-11-15",
    ).toBe(true);

    expect(createCustomerMock).not.toHaveBeenCalled();
    expect(createSubscriptionMock).not.toHaveBeenCalled();
    expect(updateMock).not.toHaveBeenCalled();
    expect(updateManyMock).not.toHaveBeenCalled();
  });

  it("1 assinatura compativel: oferece vinculo/reuso sem duplicar", async () => {
    findUniqueMock.mockResolvedValue(empresaSemVinculo());
    buscarCustomerMock.mockResolvedValue({ ok: true, customer: { id: "cus_E1" } });
    listSubsMock.mockResolvedValue([
      {
        id: "sub_existente",
        status: "ACTIVE",
        customerId: "cus_E1",
        value: 49.9,
        cycle: "MONTHLY",
        nextDueDate: "2026-12-10",
      },
    ]);
    listHistoryMock.mockResolvedValue([]);

    const r = await montarPreview("E1", AGORA);

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.preview.modo).toBe("provisionamento");
    expect(r.preview.proposta.acao).toBe("vincular_assinatura");
    expect(r.preview.asaas.assinatura.id).toBe("sub_existente");
    expect(r.preview.provisionamento).toBeUndefined();
    expect(createSubscriptionMock).not.toHaveBeenCalled();
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("2+ assinaturas: modo conflito, nunca escolhe sozinho", async () => {
    findUniqueMock.mockResolvedValue(empresaSemVinculo());
    buscarCustomerMock.mockResolvedValue({ ok: true, customer: { id: "cus_E1" } });
    listSubsMock.mockResolvedValue([
      { id: "sub_a", status: "ACTIVE", customerId: "cus_E1" },
      { id: "sub_b", status: "ACTIVE", customerId: "cus_E1" },
    ]);

    const r = await montarPreview("E1", AGORA);

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.preview.modo).toBe("conflito");
    expect(r.preview.conflito?.motivo).toBe("multiplas_assinaturas_no_customer");
    expect(r.preview.asaas.assinatura.situacao).toBe("multipla");
    expect(createSubscriptionMock).not.toHaveBeenCalled();
  });

  it("customer existente ligado a outra empresa: conflito 409", async () => {
    findUniqueMock.mockResolvedValue(empresaSemVinculo());
    buscarCustomerMock.mockResolvedValue({ ok: true, customer: { id: "cus_E1" } });
    findFirstMock.mockResolvedValue({ id: "E2" });

    const r = await montarPreview("E1", AGORA);

    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.http).toBe(409);
    expect(r.erro).toBe("conflito_vinculo");
    expect(r.motivo).toBe("customer_de_outra_empresa");
    expect(createSubscriptionMock).not.toHaveBeenCalled();
  });

  it("assinatura unica inativa: conflito (nunca criar por cima)", async () => {
    findUniqueMock.mockResolvedValue(empresaSemVinculo());
    buscarCustomerMock.mockResolvedValue({ ok: true, customer: { id: "cus_E1" } });
    listSubsMock.mockResolvedValue([
      { id: "sub_old", status: "CANCELLED", customerId: "cus_E1" },
    ]);

    const r = await montarPreview("E1", AGORA);

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.preview.modo).toBe("conflito");
    expect(r.preview.conflito?.motivo).toBe("assinatura_unica_inativa");
    expect(createSubscriptionMock).not.toHaveBeenCalled();
  });

  it("sem segredo de preview: falha fechada 503", async () => {
    delete process.env.MASTER_PREVIEW_SECRET;
    delete process.env.ASAAS_WEBHOOK_SECRET;

    const r = await montarPreview("E1", AGORA);

    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.http).toBe(503);
    expect(findUniqueMock).not.toHaveBeenCalled();
  });
});
