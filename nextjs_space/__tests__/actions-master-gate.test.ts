/**
 * @jest-environment node
 *
 * Teste do gate de pagamento nos endpoints master `aprovar`, `renovar`,
 * `updateVencimento` (`app/api/master/empresas/actions/route.ts`).
 *
 * Critico (Backend-Pro, read-only main): em PROD, 2 empresas ATIVO sem
 * asaas_customer_id/asaas_subscription_id têm vencimentos futuros porque os
 * endpoints gravam ATIVO/data local sem exigir RECEIVED. Aqui o gate da
 * branch exige `conferencia.confirmado` (so RECEIVED comprovado) antes de
 * qualquer escrita. `pausar` continua permitida (nao e reativacao).
 *
 * Todos os externos mockados; URLs DB dummy; sem conexao real, banco,
 * env, Asaas ou producao.
 */
jest.mock("next-auth", () => ({
  getServerSession: jest.fn(),
  default: jest.fn(() => ({})),
}));

jest.mock("@/lib/auth", () => ({
  authOptions: {},
  getServerSession: jest.fn(),
}));

jest.mock("@/lib/db", () => ({
  prisma: {
    empresa: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock("@/lib/asaas", () => ({
  asaas: {
    reactivateSubscription: jest.fn(),
    updateSubscriptionDueDate: jest.fn(),
    pauseSubscription: jest.fn(),
    listPaymentHistory: jest.fn(),
  },
}));

jest.mock("@/lib/pagamento", () => ({
  conferirPagamentoConfirmado: jest.fn(),
}));

import { getServerSession } from "next-auth";
import { prisma } from "@/lib/db";
import { asaas } from "@/lib/asaas";
import { conferirPagamentoConfirmado } from "@/lib/pagamento";
import { POST } from "@/app/api/master/empresas/actions/route";

const sessaoMock = getServerSession as jest.Mock;
const findUniqueMock = prisma.empresa.findUnique as jest.Mock;
const updateMock = prisma.empresa.update as jest.Mock;
const conferenciaMock = conferirPagamentoConfirmado as jest.Mock;

const empresaSemAsaas = {
  id: "E1",
  nome: "Empresa 1",
  asaasSubscriptionId: null,
  asaasCustomerId: null,
  status: "ATIVO",
  vencimentoPlano: new Date("2026-12-15T00:00:00.000Z"),
};

const empresaComAsaas = {
  id: "E2",
  nome: "Empresa 2",
  asaasSubscriptionId: "sub_E2",
  asaasCustomerId: "cus_E2",
  status: "ATIVO",
  vencimentoPlano: new Date("2026-11-15T00:00:00.000Z"),
};

beforeEach(() => {
  jest.clearAllMocks();
  process.env.ASAAS_WEBHOOK_SECRET = "segredo";
  sessaoMock.mockResolvedValue({ user: { role: "master" } });
  // Sem RECEIVED: falha fechada, confirmado falso, sem pendencia
  conferenciaMock.mockResolvedValue({
    confirmado: false,
    fonte: "nenhuma",
    pendente: false,
  });
  updateMock.mockImplementation((_where: unknown, data: unknown) => {
    return Promise.resolve({ id: "E1", ...(data as Record<string, unknown>) });
  });
});

const post = async (body: Record<string, unknown>) => {
  const req: Request = new Request(
    "http://localhost/api/master/empresas/actions",
    { method: "POST", body: JSON.stringify(body) },
  ) as unknown as Request;
  return POST(req as never);
};

it("aprovar sem RECEIVED: rejeita 400, zero escrita", async () => {
  findUniqueMock.mockResolvedValue(empresaSemAsaas);

  const res = await post({ action: "aprovar", empresaId: "E1" });

  expect(res.status).toBe(400);
  expect(updateMock).not.toHaveBeenCalled();
  expect(conferenciaMock).toHaveBeenCalled();
});

it("renovar sem RECEIVED: rejeita 400, zero escrita", async () => {
  findUniqueMock.mockResolvedValue(empresaSemAsaas);

  const res = await post({ action: "renovar", empresaId: "E1" });

  expect(res.status).toBe(400);
  expect(updateMock).not.toHaveBeenCalled();
});

it("updateVencimento sem RECEIVED: rejeita 400, zero escrita", async () => {
  findUniqueMock.mockResolvedValue(empresaSemAsaas);

  const res = await post({
    action: "updateVencimento",
    empresaId: "E1",
    novoVencimento: "2027-01-15",
  });

  expect(res.status).toBe(400);
  expect(updateMock).not.toHaveBeenCalled();
});

it("pausar sem RECEIVED: continua permitida (nao e reativacao)", async () => {
  findUniqueMock.mockResolvedValue(empresaSemAsaas);

  const res = await post({ action: "pausar", empresaId: "E1" });

  expect(res.status).toBe(200);
  // Pausar escreve status PAUSADO + marcador
  expect(updateMock).toHaveBeenCalledTimes(1);
  const chamada = updateMock.mock.calls[0][0] as { data: unknown };
  expect(chamada.data).toMatchObject({ status: "PAUSADO" });
});

it("aprovar com RECEIVED confirmado: permite e escreve", async () => {
  findUniqueMock.mockResolvedValue(empresaComAsaas);
  conferenciaMock.mockResolvedValue({
    confirmado: true,
    fonte: "asaas",
    pendente: false,
  });

  const res = await post({ action: "aprovar", empresaId: "E2" });

  expect(res.status).toBe(200);
  expect(updateMock).toHaveBeenCalledTimes(1);
});

// --- Cobertura `reativar` e casos positivos faltantes (QA) ---

const empresaPausada = {
  ...empresaSemAsaas,
  id: "E3",
  status: "PAUSADO",
  liberacaoTemporariaAte: new Date("1970-01-01T00:00:00.000Z"),
};

it("reativar sem RECEIVED: rejeita 400, zero escrita", async () => {
  findUniqueMock.mockResolvedValue(empresaPausada);

  const res = await post({ action: "reativar", empresaId: "E3" });

  expect(res.status).toBe(400);
  expect(conferenciaMock).toHaveBeenCalled();
  expect(updateMock).not.toHaveBeenCalled();
  const body = (await res.json()) as { error: string };
  expect(body.error).toMatch(/PAYMENT_RECEIVED/);
});

it("reativar com RECEIVED: restaura ATIVO e limpa marcador", async () => {
  findUniqueMock.mockResolvedValue(empresaPausada);
  conferenciaMock.mockResolvedValue({
    confirmado: true,
    fonte: "asaas",
    pendente: false,
  });

  const res = await post({ action: "reativar", empresaId: "E3" });

  expect(res.status).toBe(200);
  expect(updateMock).toHaveBeenCalledTimes(1);
  const chamada = updateMock.mock.calls[0][0] as { data: unknown };
  expect(chamada.data).toMatchObject({
    status: "ATIVO",
    liberacaoTemporariaAte: null,
  });
});

it("reativar CANCELADO mesmo com RECEIVED: rejeita 400", async () => {
  findUniqueMock.mockResolvedValue({ ...empresaPausada, status: "CANCELADO" });
  conferenciaMock.mockResolvedValue({
    confirmado: true,
    fonte: "asaas",
    pendente: false,
  });

  const res = await post({ action: "reativar", empresaId: "E3" });

  expect(res.status).toBe(400);
  expect(updateMock).not.toHaveBeenCalled();
});

it("renovar com RECEIVED: permite e escreve novo vencimento", async () => {
  findUniqueMock.mockResolvedValue(empresaComAsaas);
  conferenciaMock.mockResolvedValue({
    confirmado: true,
    fonte: "asaas",
    pendente: false,
  });

  const res = await post({ action: "renovar", empresaId: "E2" });

  expect(res.status).toBe(200);
  expect(updateMock).toHaveBeenCalledTimes(1);
});

it("updateVencimento com RECEIVED: permite e escreve", async () => {
  findUniqueMock.mockResolvedValue(empresaComAsaas);
  conferenciaMock.mockResolvedValue({
    confirmado: true,
    fonte: "asaas",
    pendente: false,
  });

  const res = await post({
    action: "updateVencimento",
    empresaId: "E2",
    novoVencimento: "2027-01-15",
  });

  expect(res.status).toBe(200);
  expect(updateMock).toHaveBeenCalledTimes(1);
  const chamada = updateMock.mock.calls[0][0] as { data: unknown };
  expect(chamada.data).toMatchObject({ status: "ATIVO" });
});
