/**
 * @jest-environment node
 *
 * A acao master `syncAsaas` foi descontinuada: ela escrevia status/vencimento
 * sem preview. Agora todo caminho de escrita passa por
 * `/api/master/asaas/preview` + `/api/master/asaas/confirm`. Este teste garante
 * que a rota antiga responde 410 SEM tocar banco nem Asaas — nenhum caminho
 * legado pode alterar estado por chamada direta.
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
    getSubscription: jest.fn(),
    listPaymentHistory: jest.fn(),
  },
}));

import { getServerSession } from "next-auth";
import { prisma } from "@/lib/db";
import { asaas } from "@/lib/asaas";
import { POST } from "@/app/api/master/empresas/actions/route";
import type { NextRequest } from "next/server";

const sessaoMock = getServerSession as jest.Mock;
const findUniqueMock = prisma.empresa.findUnique as jest.Mock;
const updateMock = prisma.empresa.update as jest.Mock;
const getSubscriptionMock = asaas.getSubscription as jest.Mock;

const postSyncAsaas = async (empresaId = "E1") => {
  const req: NextRequest = new Request(
    "http://localhost/api/master/empresas/actions",
    {
      method: "POST",
      body: JSON.stringify({ action: "syncAsaas", empresaId }),
    },
  ) as unknown as NextRequest;
  return POST(req);
};

beforeEach(() => {
  jest.clearAllMocks();
  sessaoMock.mockResolvedValue({ user: { role: "master", id: "u1" } });
});

it("syncAsaas responde 410 e nao escreve nada", async () => {
  findUniqueMock.mockResolvedValue({
    id: "E1",
    nome: "Empresa 1",
    asaasSubscriptionId: "sub_E1",
    asaasCustomerId: "cus_E1",
    status: "EM_TESTE",
    vencimentoPlano: new Date("2026-11-10T00:00:00.000Z"),
  });

  const res = await postSyncAsaas();

  expect(res.status).toBe(410);
  const body = await res.json();
  expect(body.previewEndpoint).toBe("/api/master/asaas/preview");
  expect(body.confirmEndpoint).toBe("/api/master/asaas/confirm");

  // Nenhum efeito colateral: nem leitura de empresa, nem escrita, nem Asaas.
  expect(findUniqueMock).not.toHaveBeenCalled();
  expect(updateMock).not.toHaveBeenCalled();
  expect(getSubscriptionMock).not.toHaveBeenCalled();
});

it("nao master: 403", async () => {
  sessaoMock.mockResolvedValue({ user: { role: "cliente", id: "u2" } });

  const res = await postSyncAsaas();

  expect(res.status).toBe(403);
  expect(updateMock).not.toHaveBeenCalled();
});
