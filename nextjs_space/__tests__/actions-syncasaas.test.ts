/**
 * @jest-environment node
 *
 * Teste da ação master `syncAsaas` (`app/api/master/empresas/actions/route.ts`).
 *
 * Critérios (P1 Tech-Lead): nunca conceder acesso por `subscription.nextDueDate`;
 * cobertura só por histórico RECEIVED via `coberturaComprovada`;
 * nunca diminuir vencimento local (`avancarVencimentoSeMaior`);
 * histórico null / falha do Asaas -> pendência 503, zero escrita no banco.
 * Todos os externos são mockados; nenhuma conexão de banco nem chamada Asaas real.
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

jest.mock("@/lib/pagamento", () => ({
  conferirPagamentoConfirmado: jest.fn(),
  coberturaComprovada: jest.fn(),
  avancarVencimentoSeMaior: jest.fn(),
}));

import { getServerSession } from "next-auth";
import { prisma } from "@/lib/db";
import { asaas } from "@/lib/asaas";
import {
  conferirPagamentoConfirmado,
  coberturaComprovada,
  avancarVencimentoSeMaior,
} from "@/lib/pagamento";
import { POST } from "@/app/api/master/empresas/actions/route";
import type { NextRequest } from "next/server";

const sessaoMock = getServerSession as jest.Mock;
const findUniqueMock = prisma.empresa.findUnique as jest.Mock;
const updateMock = prisma.empresa.update as jest.Mock;
const getSubscriptionMock = asaas.getSubscription as jest.Mock;
const listHistoryMock = asaas.listPaymentHistory as jest.Mock;
const conferenciaMock = conferirPagamentoConfirmado as jest.Mock;
const coberturaMock = coberturaComprovada as jest.Mock;
const avancarMock = avancarVencimentoSeMaior as jest.Mock;

function empresa(id: string, venc: Date | null, status = "ATIVO") {
  return {
    id,
    nome: `Empresa ${id}`,
    asaasSubscriptionId: "sub_" + id,
    asaasCustomerId: "cus_" + id,
    status,
    vencimentoPlano: venc,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  process.env.ASAAS_WEBHOOK_SECRET = "segredo";
  sessaoMock.mockResolvedValue({ user: { role: "master" } });
  getSubscriptionMock.mockResolvedValue({
    status: "ACTIVE",
    customerId: "cus_E1",
    // nextDueDate futuro (algo que o Asaas informa mesmo sem pagamento)
    nextDueDate: "2027-01-10",
  });
  listHistoryMock.mockResolvedValue([]);
  coberturaMock.mockImplementation(
    (_historico: unknown, _ctx: unknown) => new Date("2026-12-10T00:00:00.000Z"),
  );
  avancarMock.mockImplementation(
    (_atual: Date | null, alvo: Date | null) => alvo,
  );
  updateMock.mockImplementation((_where: unknown, data: unknown) => {
    return Promise.resolve({ id: "E1", ...(data as Record<string, unknown>) });
  });
});

const postSyncAsaas = async (empresaId = "E1") => {
  const req: NextRequest = new Request("http://localhost/api/master/empresas/actions", {
    method: "POST",
    body: JSON.stringify({ action: "syncAsaas", empresaId }),
  }) as unknown as NextRequest;
  const res = await POST(req);
  return res;
};

it("1) nextDueDate futuro não excede cobertura paga", async () => {
  findUniqueMock.mockResolvedValue(empresa("E1", new Date("2026-11-10T00:00:00.000Z")));
  conferenciaMock.mockResolvedValue({ confirmado: true, fonte: "asaas", pendente: false });

  const res = await postSyncAsaas();

  expect(res.status).toBe(200);
  // O vencimento gravado é a cobertura paga (2026-12-10), nunca o nextDueDate (2027-01-10)
  const gravado =
    updateMock.mock.calls.length > 0
      ? updateMock.mock.calls[0][0]?.data?.vencimentoPlano
      : "SEM_CHAMADA_UPDATE";
  expect(gravado).not.toBe("SEM_CHAMADA_UPDATE");
  expect(new Date(gravado as string).getTime()).toBe(
    new Date("2026-12-10T00:00:00.000Z").getTime(),
  );
  expect(avancarMock).toHaveBeenCalledWith(
    new Date("2026-11-10T00:00:00.000Z"),
    expect.any(Date),
  );
  expect(updateMock).toHaveBeenCalledTimes(1);
});

it("2) vencimento local maior não diminui", async () => {
  // Vencimento local já está à frente da cobertura paga
  findUniqueMock.mockResolvedValue(
    empresa("E1", new Date("2027-06-01T00:00:00.000Z")),
  );
  conferenciaMock.mockResolvedValue({ confirmado: true, fonte: "asaas", pendente: false });
  // avancarVencimentoSeMaior retorna null (alvo <= atual) -> não escreve vencimento
  avancarMock.mockReturnValue(null);

  const res = await postSyncAsaas();

  expect(res.status).toBe(200);
  const dataUpdate = updateMock.mock.calls[0][0]?.data;
  expect(dataUpdate.vencimentoPlano).toBeUndefined();
  // Status ainda é atualizado (ATIVO), mas o vencimento não foi diminuído
  expect(dataUpdate.status).toBe("ATIVO");
});

it("3) histórico null resulta pendência 503, zero escrita", async () => {
  findUniqueMock.mockResolvedValue(empresa("E1", new Date("2026-11-10T00:00:00.000Z")));
  // Falha do Asaas: histórico indisponível (null)
  listHistoryMock.mockResolvedValue(null);
  conferenciaMock.mockResolvedValue({ confirmado: false, fonte: "nenhuma", pendente: true });

  const res = await postSyncAsaas();

  expect(res.status).toBe(503);
  const body = await res.json();
  expect(body.status).toBe("pendente");
  // Zero escrita no banco e nenhuma cobertura calculada
  expect(updateMock).not.toHaveBeenCalled();
  expect(coberturaMock).not.toHaveBeenCalled();
});

it("não master: 403", async () => {
  sessaoMock.mockResolvedValue({ user: { role: "cliente" } });

  const res = await postSyncAsaas();

  expect(res.status).toBe(403);
  expect(findUniqueMock).not.toHaveBeenCalled();
});
