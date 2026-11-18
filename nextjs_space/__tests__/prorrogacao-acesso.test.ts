/**
 * @jest-environment node
 *
 * Prorrogação manual de acesso (`action: "prorrogarAcesso"`).
 *
 * Regra: gravar APENAS `liberacaoTemporariaAte`, que `avaliarAcesso` lê antes de
 * PAUSADO/vencimento. Nada de status, dia de vencimento, vencimento cobrado ou
 * Asaas. O campo é limite EXCLUSIVO: 00:00 de São Paulo do dia seguinte, para o
 * acesso valer até 23:59:59.999 do dia escolhido.
 *
 * Todos os externos mockados; zero banco/Asaas/rede.
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
      updateMany: jest.fn(),
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
import { avaliarAcesso } from "@/lib/access";

const sessaoMock = getServerSession as jest.Mock;
const findUniqueMock = prisma.empresa.findUnique as jest.Mock;
const updateManyMock = prisma.empresa.updateMany as jest.Mock;

const empresaEmAtraso = {
  id: "E1",
  nome: "Adega",
  status: "ATIVO",
  asaasCustomerId: null,
  asaasSubscriptionId: null,
  vencimentoPlano: new Date("2026-11-15T00:00:00.000Z"),
  liberacaoTemporariaAte: null,
};

beforeEach(() => {
  jest.clearAllMocks();
  sessaoMock.mockResolvedValue({ user: { role: "master" } });
  updateManyMock.mockResolvedValue({ count: 1 });
});

const post = async (body: Record<string, unknown>) => {
  const req = new Request("http://localhost/api/master/empresas/actions", {
    method: "POST",
    body: JSON.stringify(body),
  }) as unknown as Request;
  return POST(req as never);
};

const prorrogar = (novaDataCivil: string, empresaId = "E1") =>
  post({ action: "prorrogarAcesso", empresaId, novaDataCivil });

it("só master: admin comum recebe 403 e nada é escrito", async () => {
  sessaoMock.mockResolvedValue({ user: { role: "admin" } });
  findUniqueMock.mockResolvedValue(empresaEmAtraso);

  const res = await prorrogar("2027-06-30");

  expect(res.status).toBe(403);
  expect(updateManyMock).not.toHaveBeenCalled();
});

it("grava somente liberacaoTemporariaAte, sem status, vencimento ou Asaas", async () => {
  findUniqueMock.mockResolvedValue(empresaEmAtraso);

  const res = await prorrogar("2027-06-30");

  expect(res.status).toBe(200);
  expect(updateManyMock).toHaveBeenCalledTimes(1);
  const chamada = updateManyMock.mock.calls[0][0] as { data: unknown };
  expect(chamada.data).toEqual({
    liberacaoTemporariaAte: new Date("2027-07-01T03:00:00.000Z"),
  });
  expect(asaas.reactivateSubscription).not.toHaveBeenCalled();
  expect(asaas.updateSubscriptionDueDate).not.toHaveBeenCalled();
  expect(conferirPagamentoConfirmado).not.toHaveBeenCalled();

  // Resposta sem o modelo completo da empresa (documento/endereço).
  const body = (await res.json()) as Record<string, unknown>;
  expect(body.empresa).toBeUndefined();
  expect(body.liberacaoTemporariaAte).toBe("2027-07-01T03:00:00.000Z");
});

it("libera até 23:59:59.999 de São Paulo e bloqueia às 00:00 do dia seguinte", async () => {
  findUniqueMock.mockResolvedValue(empresaEmAtraso);
  const res = await prorrogar("2027-06-30");
  const body = (await res.json()) as { liberacaoTemporariaAte: string };

  const base = {
    role: "admin",
    status: "ATIVO",
    vencimentoPlano: "2026-11-15",
    liberacaoTemporariaAte: body.liberacaoTemporariaAte,
  };

  // 2027-06-30T02:59:59.999Z = 23:59:59.999 em America/Sao_Paulo
  const ultimoInstante = avaliarAcesso(
    base,
    new Date("2027-06-30T02:59:59.999Z"),
  );
  expect(ultimoInstante.permitido).toBe(true);
  expect(ultimoInstante.motivo).toBe("liberacao-temporaria");

  // 2027-07-01T03:00:00.000Z = 00:00:00.000 em America/Sao_Paulo
  const virada = avaliarAcesso(base, new Date("2027-07-01T03:00:00.000Z"));
  expect(virada.permitido).toBe(false);
  expect(virada.motivo).toBe("plano-vencido");
});

it("empresa PAUSADO pelo cron (sem marcador) pode ser prorrogada", async () => {
  findUniqueMock.mockResolvedValue({ ...empresaEmAtraso, status: "PAUSADO" });

  const res = await prorrogar("2027-06-30");

  expect(res.status).toBe(200);
  const avaliacao = avaliarAcesso(
    {
      role: "admin",
      status: "PAUSADO",
      vencimentoPlano: "2026-11-15",
      liberacaoTemporariaAte: "2027-07-01T03:00:00.000Z",
    },
    new Date("2026-11-18T12:00:00.000Z"),
  );
  expect(avaliacao.permitido).toBe(true);
  expect(avaliacao.motivo).toBe("liberacao-temporaria");
});

it("não sobrescreve pausa manual (marcador 1970)", async () => {
  findUniqueMock.mockResolvedValue({
    ...empresaEmAtraso,
    status: "PAUSADO",
    liberacaoTemporariaAte: new Date("1970-01-01T00:00:00.000Z"),
  });

  const res = await prorrogar("2027-06-30");

  expect(res.status).toBe(409);
  expect(updateManyMock).not.toHaveBeenCalled();
});

it("escrita condicional: estado mudou durante a prorrogação vira 409", async () => {
  findUniqueMock.mockResolvedValue(empresaEmAtraso);
  updateManyMock.mockResolvedValue({ count: 0 });

  const res = await prorrogar("2027-06-30");

  expect(res.status).toBe(409);
  expect(updateManyMock).toHaveBeenCalledTimes(1);
});

it.each(["PENDENTE", "CANCELADO"])(
  "recusa %s com 400 e zero escrita",
  async (status) => {
    findUniqueMock.mockResolvedValue({ ...empresaEmAtraso, status });

    const res = await prorrogar("2027-06-30");

    expect(res.status).toBe(400);
    expect(updateManyMock).not.toHaveBeenCalled();
  },
);

it("recusa data inexistente no calendário", async () => {
  findUniqueMock.mockResolvedValue(empresaEmAtraso);

  const res = await prorrogar("2026-02-31");

  expect(res.status).toBe(400);
  expect(updateManyMock).not.toHaveBeenCalled();
});

it("recusa data já passada", async () => {
  findUniqueMock.mockResolvedValue(empresaEmAtraso);

  const res = await prorrogar("2020-01-01");

  expect(res.status).toBe(400);
  expect(updateManyMock).not.toHaveBeenCalled();
});

it("recusa formato diferente de AAAA-MM-DD", async () => {
  findUniqueMock.mockResolvedValue(empresaEmAtraso);

  const res = await prorrogar("30/06/2027");

  expect(res.status).toBe(400);
  expect(updateManyMock).not.toHaveBeenCalled();
});
