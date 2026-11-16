/**
 * @jest-environment node
 *
 * Teste de rota `sync-all` (`app/api/master/sync-all/route.ts`).
 *
 * Prova o critério de sincronizacao: historico vazio/indisponivel nao promove
 * nem altera vencimento; RECEIVED comprovado avanca uma vez.
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
      findMany: jest.fn(),
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

jest.mock("@/lib/access", () => ({
  decidirStatusSincronizado: jest.fn(),
}));

jest.mock("@/lib/pagamento", () => ({
  conferirPagamentoConfirmado: jest.fn(),
  coberturaComprovada: jest.fn(),
  avancarVencimentoSeMaior: jest.fn(),
}));

jest.mock("@/lib/mgm-sync", () => ({
  sincronizarBeneficiosEmpresa: jest.fn(),
}));

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/db";
import { asaas } from "@/lib/asaas";
import { decidirStatusSincronizado } from "@/lib/access";
import {
  conferirPagamentoConfirmado,
  coberturaComprovada,
  avancarVencimentoSeMaior,
} from "@/lib/pagamento";
import { sincronizarBeneficiosEmpresa } from "@/lib/mgm-sync";
import { POST } from "@/app/api/master/sync-all/route";

const sessaoMock = getServerSession as jest.Mock;
const findManyMock = prisma.empresa.findMany as jest.Mock;
const updateMock = prisma.empresa.update as jest.Mock;
const getSubscriptionMock = asaas.getSubscription as jest.Mock;
const listHistoryMock = asaas.listPaymentHistory as jest.Mock;
const decidirMock = decidirStatusSincronizado as jest.Mock;
const conferenciaMock = conferirPagamentoConfirmado as jest.Mock;
const coberturaMock = coberturaComprovada as jest.Mock;
const avancarMock = avancarVencimentoSeMaior as jest.Mock;
const decisaoMock = decidirStatusSincronizado as jest.Mock;
const mgmMock = sincronizarBeneficiosEmpresa as jest.Mock;

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
    nextDueDate: "2026-12-10",
  });
  mgmMock.mockResolvedValue([]);
  decisaoMock.mockReturnValue("ATIVO");
  avancarMock.mockImplementation((_atual: Date | null, alvo: Date | null) =>
    alvo,
  );
});

it("historico vazio: nao promove nem altera vencimento (pendente/fail-closed)", async () => {
  const emp = empresa("E1", new Date("2026-11-10T00:00:00.000Z"));
  findManyMock.mockResolvedValue([emp]);
  conferenciaMock.mockResolvedValue({
    confirmado: false,
    fonte: "nenhuma",
    pendente: false,
  });
  coberturaMock.mockReturnValue(null);

  const res = await POST();

  expect(res.status).toBe(200);
  const body = await res.json();
  expect(body.pendentes).toBe(0);
  // Historico vazio: nunca avanca vencimento
  const comVencimento = updateMock.mock.calls.some(
    (c) => c[1]?.data?.vencimentoPlano !== undefined,
  );
  expect(comVencimento).toBe(false);
});

it("historico indisponivel (null): nao promove nem altera vencimento", async () => {
  const emp = empresa("E1", new Date("2026-11-10T00:00:00.000Z"));
  findManyMock.mockResolvedValue([emp]);
  conferenciaMock.mockResolvedValue({
    confirmado: false,
    fonte: "nenhuma",
    pendente: true,
  });
  coberturaMock.mockReturnValue(null);

  const res = await POST();
  const body = await res.json();

  expect(res.status).toBe(200);
  expect(body.pendentes).toBe(1);
  // Historico indisponivel: nunca avanca vencimento
  const comVencimento = updateMock.mock.calls.some(
    (c) => c[1]?.data?.vencimentoPlano !== undefined,
  );
  expect(comVencimento).toBe(false);
});

it("RECEIVED comprovado: promove para ATIVO e avanca o vencimento uma vez", async () => {
  const emp = empresa("E1", new Date("2026-11-10T00:00:00.000Z"));
  const vencNovo = new Date("2026-12-10T00:00:00.000Z");
  findManyMock.mockResolvedValue([emp]);
  conferenciaMock.mockResolvedValue({
    confirmado: true,
    fonte: "asaas",
    pendente: false,
  });
  coberturaMock.mockReturnValue(vencNovo);
  decisaoMock.mockReturnValue("ATIVO");

  const res = await POST();
  const body = await res.json();

  expect(res.status).toBe(200);
  expect(updateMock).toHaveBeenCalledTimes(1);
  const chamada = updateMock.mock.calls[0][0];
  expect(chamada.where.id).toBe("E1");
  expect(chamada.data.vencimentoPlano).toEqual(vencNovo);
  expect(chamada.data.status).toBe("ATIVO");
  expect(body.updated).toBe(1);
});

it("empresa sem assinatura aparece como sem_cadastro e NAO e provisionada", async () => {
  findManyMock.mockResolvedValue([
    {
      id: "E9",
      nome: "Empresa sem Asaas",
      asaasSubscriptionId: null,
      asaasCustomerId: null,
      status: "PENDENTE",
      vencimentoPlano: null,
    },
  ]);

  const res = await POST();
  const body = await res.json();

  expect(res.status).toBe(200);
  expect(body.semCadastro).toBe(1);
  expect(body.vinculadas).toBe(0);
  expect(body.details[0]).toMatchObject({
    empresa: "Empresa sem Asaas",
    status: "sem_cadastro",
  });
  // Lote nunca provisiona: nenhum GET/POST ao Asaas e nenhuma escrita.
  expect(getSubscriptionMock).not.toHaveBeenCalled();
  expect(updateMock).not.toHaveBeenCalled();
});

it("CANCELLED no Asaas nao vira CANCELADO em lote (pendencia de confirmacao)", async () => {
  const emp = empresa("E1", new Date("2026-11-10T00:00:00.000Z"), "ATIVO");
  findManyMock.mockResolvedValue([emp]);
  getSubscriptionMock.mockResolvedValue({
    status: "CANCELLED",
    customerId: "cus_E1",
    nextDueDate: "2026-12-10",
  });
  conferenciaMock.mockResolvedValue({
    confirmado: false,
    fonte: "nenhuma",
    pendente: false,
  });
  coberturaMock.mockReturnValue(null);

  const res = await POST();
  const body = await res.json();

  expect(res.status).toBe(200);
  expect(body.pendentes).toBe(1);
  // Status atual preservado, nunca terminal silencioso.
  const data = updateMock.mock.calls[0][0].data;
  expect(data.status).toBe("ATIVO");
  expect(data.status).not.toBe("CANCELADO");
  expect(body.details.some((d: { pendencia?: string }) => d.pendencia)).toBe(true);
  // A decisao de status nem e consultada para terminal.
  expect(decidirMock).not.toHaveBeenCalled();
});

it("INACTIVE pausa em lote (nunca CANCELADO)", async () => {
  const emp = empresa("E1", new Date("2026-11-10T00:00:00.000Z"), "ATIVO");
  findManyMock.mockResolvedValue([emp]);
  getSubscriptionMock.mockResolvedValue({
    status: "INACTIVE",
    customerId: "cus_E1",
    nextDueDate: "2026-12-10",
  });
  conferenciaMock.mockResolvedValue({
    confirmado: false,
    fonte: "nenhuma",
    pendente: false,
  });
  coberturaMock.mockReturnValue(null);
  decisaoMock.mockImplementation(
    (_atual, asaas, _venc, _agora, _recebido, opcoes) =>
      // Espelha a regra real do lib/access para o caso INACTIVE.
      String(asaas).toUpperCase() === "INACTIVE"
        ? "PAUSADO"
        : opcoes?.confirmarTerminal
          ? "CANCELADO"
          : "ATIVO",
  );

  const res = await POST();

  expect(res.status).toBe(200);
  const data = updateMock.mock.calls[0][0].data;
  expect(data.status).toBe("PAUSADO");
  expect(decidirMock).toHaveBeenCalledWith(
    "ATIVO",
    "INACTIVE",
    expect.anything(),
    expect.any(Date),
    false,
    { confirmarTerminal: false },
  );
});

it("interrompe execucao quando atinge deadline de 45s retornando resultado parcial", async () => {
  const emp1 = empresa("E1", new Date("2026-11-10T00:00:00.000Z"), "ATIVO");
  const emp2 = empresa("E2", new Date("2026-11-10T00:00:00.000Z"), "ATIVO");
  findManyMock.mockResolvedValue([emp1, emp2]);

  const realNow = Date.now;
  let callCount = 0;
  // Simula avanço de tempo: primeira empresa ok, segunda empresa passa de 45s
  jest.spyOn(Date, "now").mockImplementation(() => {
    callCount++;
    return callCount > 2 ? realNow() + 50_000 : realNow();
  });

  conferenciaMock.mockResolvedValue({
    confirmado: false,
    fonte: "nenhuma",
    pendente: false,
  });
  coberturaMock.mockReturnValue(null);

  const res = await POST();
  const body = await res.json();

  expect(res.status).toBe(200);
  expect(body.timeout).toBe(true);
  expect(body.parcial).toBe(true);
  expect(body.pendentes).toBe(1);
  expect(
    body.details.some(
      (d: { pendencia?: string }) => d.pendencia && d.pendencia.includes("45s"),
    ),
  ).toBe(true);

  jest.spyOn(Date, "now").mockRestore();
});

it("nao e master: 401", async () => {
  sessaoMock.mockResolvedValue({ user: { role: "cliente" } });

  const res = await POST();

  expect(res.status).toBe(401);
  expect(findManyMock).not.toHaveBeenCalled();
});
