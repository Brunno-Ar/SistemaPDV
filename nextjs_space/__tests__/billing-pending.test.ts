/**
 * @jest-environment node
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
    user: { findFirst: jest.fn() },
  },
}));

jest.mock("@/lib/asaas", () => ({
  asaas: {
    getSubscriptionBillingInfo: jest.fn(),
    listPaymentHistory: jest.fn(),
  },
}));

import { getServerSession } from "next-auth";
import { prisma } from "@/lib/db";
import { asaas } from "@/lib/asaas";
import { GET } from "@/app/api/billing/pending/route";
import { NextRequest } from "next/server";
import {
  montarRespostaFatura,
  respostaGenerica,
  type CasoFatura,
} from "@/lib/billing-pending";

describe("billing/pending - resposta genérica (anti-enumeração)", () => {
  const ausencias: CasoFatura[] = [
    { caso: "sem-usuario" },
    { caso: "sem-assinatura" },
    { caso: "sem-fatura" },
    { caso: "erro-asaas" },
  ];

  it("todos os casos de ausência devolvem corpo e status idênticos", () => {
    const respostas = ausencias.map((c) => montarRespostaFatura(c));

    for (const r of respostas) {
      expect(r.status).toBe(200);
      expect(r.body).toEqual({ billing: null });
    }

    // Equivalência byte a byte: nada distingue uma conta da outra.
    const serializados = respostas.map((r) => JSON.stringify(r));
    expect(new Set(serializados).size).toBe(1);
  });

  it("respostaGenerica é o mesmo objeto lógico dos casos de ausência", () => {
    const generica = respostaGenerica();
    expect(generica).toEqual(montarRespostaFatura({ caso: "sem-usuario" }));
    expect(generica).toEqual(montarRespostaFatura({ caso: "erro-asaas" }));
  });

  it("caso com fatura devolve billing preenchido (não genérico)", () => {
    const r = montarRespostaFatura({
      caso: "fatura",
      value: 49.9,
      invoiceUrl: "https://asaas/inv/1",
      status: "OVERDUE",
      dueDate: "2026-11-01T00:00:00.000Z",
    });

    expect(r.status).toBe(200);
    expect(r.body).toEqual({
      billing: {
        value: 49.9,
        invoiceUrl: "https://asaas/inv/1",
        status: "OVERDUE",
        vencimento: new Date("2026-11-01T00:00:00.000Z").toLocaleDateString(
          "pt-BR",
        ),
      },
    });
  });

  it("dueDate inválido não vaza 'Invalid Date'", () => {
    const r = montarRespostaFatura({
      caso: "fatura",
      value: 10,
      invoiceUrl: null,
      status: "PENDING",
      dueDate: "nao-e-data",
    });
    expect(r.body).toEqual({
      billing: { value: 10, invoiceUrl: null, status: "PENDING", vencimento: "" },
    });
  });
});

describe("GET /api/billing/pending - contrato HTTP e autenticação", () => {
  const sessaoMock = getServerSession as jest.Mock;
  const findFirstMock = prisma.user.findFirst as jest.Mock;
  const billingInfoMock = asaas.getSubscriptionBillingInfo as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("sem sessão retorna 401 com { error: 'Não autenticado' }", async () => {
    sessaoMock.mockResolvedValue(null);
    const req = new NextRequest("http://localhost:3000/api/billing/pending");
    const res = await GET(req);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toEqual({ error: "Não autenticado" });
  });

  it("sessão sem email retorna 401 com { error: 'Não autenticado' }", async () => {
    sessaoMock.mockResolvedValue({ user: {} });
    const req = new NextRequest("http://localhost:3000/api/billing/pending");
    const res = await GET(req);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toEqual({ error: "Não autenticado" });
  });

  it("autenticado com empresa sem assinatura retorna 200 com { billing: null }", async () => {
    sessaoMock.mockResolvedValue({ user: { email: "admin@empresa.com" } });
    findFirstMock.mockResolvedValue({
      id: "u-1",
      email: "admin@empresa.com",
      empresa: { id: "emp-1", asaasSubscriptionId: null },
    });

    const req = new NextRequest("http://localhost:3000/api/billing/pending");
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ billing: null });
  });

  it("autenticado com fatura pendente retorna 200 com fatura", async () => {
    sessaoMock.mockResolvedValue({ user: { email: "admin@empresa.com" } });
    findFirstMock.mockResolvedValue({
      id: "u-1",
      email: "admin@empresa.com",
      empresa: { id: "emp-1", asaasSubscriptionId: "sub_123" },
    });
    billingInfoMock.mockResolvedValue({
      value: 99.9,
      invoiceUrl: "https://asaas/inv/99",
      dueDate: "2026-11-20T00:00:00.000Z",
    });

    const req = new NextRequest("http://localhost:3000/api/billing/pending");
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.billing).toBeDefined();
    expect(body.billing.value).toBe(99.9);
    expect(body.billing.status).toBe("PENDING");
  });
});
