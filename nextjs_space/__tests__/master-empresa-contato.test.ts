/**
 * @jest-environment node
 *
 * Testes automatizados para edicao segura de CPF/CNPJ e telefone de empresa (painel Master).
 * Cobre:
 * 1. Validacao e normalizacao server-side (lib/master-empresa-contato.ts)
 * 2. RBAC e integracao HTTP (PATCH /api/master/empresas)
 * 3. Acao dedicada (POST /api/master/empresas/actions com action: "editarContato")
 * 4. Imutabilidade estrita de status, plano e vencimento (zero sync Asaas)
 */

jest.mock("next-auth", () => ({
  getServerSession: jest.fn(),
  default: jest.fn(() => ({})),
}));

jest.mock("@/lib/auth", () => ({
  authOptions: {},
  getServerSession: jest.fn(),
}));

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}));

jest.mock("@/lib/db", () => ({
  prisma: {
    empresa: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    sale: { aggregate: jest.fn() },
    product: { count: jest.fn() },
    user: { count: jest.fn(), findFirst: jest.fn() },
    aviso: { create: jest.fn() },
  },
}));

jest.mock("@/lib/asaas", () => ({
  asaas: {
    updateSubscriptionDueDate: jest.fn(),
    reactivateSubscription: jest.fn(),
    pauseSubscription: jest.fn(),
    listPaymentHistory: jest.fn(),
  },
}));

import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/db";
import { editarEmpresaContato } from "@/lib/master-empresa-contato";
import { PATCH } from "@/app/api/master/empresas/route";
import { POST as actionsPOST } from "@/app/api/master/empresas/actions/route";

const sessaoMock = getServerSession as jest.Mock;
const findUniqueMock = prisma.empresa.findUnique as jest.Mock;
const findFirstMock = prisma.empresa.findFirst as jest.Mock;
const updateMock = prisma.empresa.update as jest.Mock;

function criarRequest(corpo: unknown, method: string = "PATCH") {
  return new NextRequest("http://localhost:3000/api/master/empresas", {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(corpo),
  });
}

describe("editarEmpresaContato (lib/master-empresa-contato)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("rejeita empresaId ausente ou vazio (400)", async () => {
    const res1 = await editarEmpresaContato({ empresaId: "" });
    expect(res1.ok).toBe(false);
    if (!res1.ok) expect(res1.status).toBe(400);

    const res2 = await editarEmpresaContato({ empresaId: null });
    expect(res2.ok).toBe(false);
    if (!res2.ok) expect(res2.status).toBe(400);
  });

  it("rejeita payload sem nenhum campo para atualizar (400)", async () => {
    const res = await editarEmpresaContato({ empresaId: "emp-1" });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.status).toBe(400);
      expect(res.erro).toContain("Informe ao menos um campo");
    }
  });

  it("rejeita CPF com tamanho invalido != 11 e != 14 (400)", async () => {
    const res = await editarEmpresaContato({
      empresaId: "emp-1",
      cpfCnpj: "123.456.789", // 9 digitos
    });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.status).toBe(400);
      expect(res.erro).toContain("CPF deve ter 11 dígitos ou CNPJ deve ter 14 dígitos");
    }
  });

  it("rejeita telefone com menos de 10 ou mais de 11 digitos (400)", async () => {
    const resCurto = await editarEmpresaContato({
      empresaId: "emp-1",
      telefone: "119999", // 6 digitos
    });
    expect(resCurto.ok).toBe(false);
    if (!resCurto.ok) expect(resCurto.status).toBe(400);

    const resLongo = await editarEmpresaContato({
      empresaId: "emp-1",
      telefone: "1199999999999", // 13 digitos sem DDI
    });
    expect(resLongo.ok).toBe(false);
    if (!resLongo.ok) expect(resLongo.status).toBe(400);
  });

  it("normaliza telefone internacional com DDI 55 (+55 11 99999-8888 -> 11999998888)", async () => {
    findUniqueMock.mockResolvedValue({
      id: "emp-1",
      nome: "Adega FreeStyle Drinks",
      cpfCnpj: null,
      telefone: null,
    });
    updateMock.mockResolvedValue({
      id: "emp-1",
      nome: "Adega FreeStyle Drinks",
      cpfCnpj: null,
      telefone: "11999998888",
    });

    const res = await editarEmpresaContato({
      empresaId: "emp-1",
      telefone: "+55 (11) 99999-8888",
    });

    expect(res.ok).toBe(true);
    expect(updateMock).toHaveBeenCalledWith({
      where: { id: "emp-1" },
      data: { telefone: "11999998888" },
      select: expect.any(Object),
    });
  });

  it("retorna 404 quando empresa nao existe", async () => {
    findUniqueMock.mockResolvedValue(null);

    const res = await editarEmpresaContato({
      empresaId: "emp-inexistente",
      cpfCnpj: "12345678000199",
    });

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.status).toBe(404);
      expect(res.erro).toBe("Empresa não encontrada");
    }
  });

  it("retorna 409 quando CPF/CNPJ pertence a outra empresa", async () => {
    findUniqueMock.mockResolvedValue({
      id: "emp-1",
      nome: "Adega FreeStyle Drinks",
      cpfCnpj: null,
      telefone: null,
    });
    findFirstMock.mockResolvedValue({ id: "emp-outra" });

    const res = await editarEmpresaContato({
      empresaId: "emp-1",
      cpfCnpj: "12.345.678/0001-99",
    });

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.status).toBe(409);
      expect(res.erro).toContain("já está cadastrado em outra empresa");
    }
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("permite salvar CPF/CNPJ ja pertencente a mesma empresa sem falso conflito 409", async () => {
    findUniqueMock.mockResolvedValue({
      id: "emp-1",
      nome: "Adega FreeStyle Drinks",
      cpfCnpj: "12345678000199",
      telefone: null,
    });
    updateMock.mockResolvedValue({
      id: "emp-1",
      nome: "Adega FreeStyle Drinks",
      cpfCnpj: "12345678000199",
      telefone: "11988887777",
    });

    const res = await editarEmpresaContato({
      empresaId: "emp-1",
      cpfCnpj: "12.345.678/0001-99",
      telefone: "(11) 98888-7777",
    });

    expect(res.ok).toBe(true);
    expect(findFirstMock).not.toHaveBeenCalled();
    expect(updateMock).toHaveBeenCalledWith({
      where: { id: "emp-1" },
      data: {
        cpfCnpj: "12345678000199",
        telefone: "11988887777",
      },
      select: expect.any(Object),
    });
  });

  it("permite limpar campos com null ou string vazia", async () => {
    findUniqueMock.mockResolvedValue({
      id: "emp-1",
      nome: "Adega FreeStyle Drinks",
      cpfCnpj: "12345678000199",
      telefone: "11988887777",
    });
    updateMock.mockResolvedValue({
      id: "emp-1",
      nome: "Adega FreeStyle Drinks",
      cpfCnpj: null,
      telefone: null,
    });

    const res = await editarEmpresaContato({
      empresaId: "emp-1",
      cpfCnpj: "",
      telefone: null,
    });

    expect(res.ok).toBe(true);
    expect(updateMock).toHaveBeenCalledWith({
      where: { id: "emp-1" },
      data: {
        cpfCnpj: null,
        telefone: null,
      },
      select: expect.any(Object),
    });
  });

  it("garante imutabilidade: status, plano e vencimento NUNCA sao passados ao update", async () => {
    findUniqueMock.mockResolvedValue({
      id: "cmi8y09c1000opg08ykdb9yz8",
      nome: "Adega FreeStyle Drinks",
      cpfCnpj: null,
      telefone: null,
    });
    findFirstMock.mockResolvedValue(null);
    updateMock.mockResolvedValue({
      id: "cmi8y09c1000opg08ykdb9yz8",
      nome: "Adega FreeStyle Drinks",
      cpfCnpj: "12345678000199",
      telefone: "11999998888",
    });

    // Simulando tentativa de payload malicioso tentando injetar status ou plano
    const payloadInvasivo = {
      empresaId: "cmi8y09c1000opg08ykdb9yz8",
      cpfCnpj: "12.345.678/0001-99",
      telefone: "(11) 99999-8888",
      status: "ATIVO",
      plano: "ENTERPRISE",
      vencimentoPlano: "2099-01-01",
    } as any;

    const res = await editarEmpresaContato(payloadInvasivo);
    expect(res.ok).toBe(true);

    const updateCalls = updateMock.mock.calls[0][0];
    expect(updateCalls.data).toEqual({
      cpfCnpj: "12345678000199",
      telefone: "11999998888",
    });
    expect(updateCalls.data.status).toBeUndefined();
    expect(updateCalls.data.plano).toBeUndefined();
    expect(updateCalls.data.vencimentoPlano).toBeUndefined();
  });
});

describe("PATCH /api/master/empresas (Endpoint HTTP)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("rejeita requisicao sem sessao autenticada (403)", async () => {
    sessaoMock.mockResolvedValue(null);

    const req = criarRequest({ empresaId: "emp-1", cpfCnpj: "12345678000199" });
    const res = await PATCH(req);

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain("Acesso negado");
  });

  it("rejeita requisicao com role admin ou user (403)", async () => {
    sessaoMock.mockResolvedValue({
      user: { id: "u-1", email: "admin@empresa.com", role: "admin" },
    });

    const req = criarRequest({ empresaId: "emp-1", cpfCnpj: "12345678000199" });
    const res = await PATCH(req);

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain("Acesso negado");
  });

  it("permite usuario master e atualiza com sucesso (200)", async () => {
    sessaoMock.mockResolvedValue({
      user: { id: "master-1", email: "master@flowpdv.com", role: "master" },
    });
    findUniqueMock.mockResolvedValue({
      id: "cmi8y09c1000opg08ykdb9yz8",
      nome: "Adega FreeStyle Drinks",
      cpfCnpj: null,
      telefone: null,
    });
    findFirstMock.mockResolvedValue(null);
    updateMock.mockResolvedValue({
      id: "cmi8y09c1000opg08ykdb9yz8",
      nome: "Adega FreeStyle Drinks",
      cpfCnpj: "12345678000199",
      telefone: "11999998888",
    });

    const req = criarRequest({
      empresaId: "cmi8y09c1000opg08ykdb9yz8",
      cpfCnpj: "12.345.678/0001-99",
      telefone: "(11) 99999-8888",
    });
    const res = await PATCH(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.empresa.cpfCnpj).toBe("12345678000199");
    expect(body.empresa.telefone).toBe("11999998888");
  });

  it("propaga erro 400 em caso de payload invalido", async () => {
    sessaoMock.mockResolvedValue({
      user: { id: "master-1", email: "master@flowpdv.com", role: "master" },
    });

    const req = criarRequest({
      empresaId: "emp-1",
      cpfCnpj: "123", // invalido
    });
    const res = await PATCH(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("CPF deve ter 11 dígitos");
  });
});

describe("POST /api/master/empresas/actions (action: editarContato)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("rejeita se nao for master (403)", async () => {
    sessaoMock.mockResolvedValue({
      user: { id: "u-1", email: "admin@empresa.com", role: "admin" },
    });

    const req = new NextRequest("http://localhost:3000/api/master/empresas/actions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "editarContato",
        empresaId: "emp-1",
        cpfCnpj: "12345678000199",
      }),
    });
    const res = await actionsPOST(req);

    expect(res.status).toBe(403);
  });

  it("executa com sucesso via action editarContato (200)", async () => {
    sessaoMock.mockResolvedValue({
      user: { id: "master-1", email: "master@flowpdv.com", role: "master" },
    });
    findUniqueMock.mockResolvedValue({
      id: "cmi8y09c1000opg08ykdb9yz8",
      nome: "Adega FreeStyle Drinks",
      cpfCnpj: null,
      telefone: null,
    });
    findFirstMock.mockResolvedValue(null);
    updateMock.mockResolvedValue({
      id: "cmi8y09c1000opg08ykdb9yz8",
      nome: "Adega FreeStyle Drinks",
      cpfCnpj: "12345678000199",
      telefone: "11999998888",
    });

    const req = new NextRequest("http://localhost:3000/api/master/empresas/actions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "editarContato",
        empresaId: "cmi8y09c1000opg08ykdb9yz8",
        cpfCnpj: "12.345.678/0001-99",
        telefone: "(11) 99999-8888",
      }),
    });
    const res = await actionsPOST(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.empresa.cpfCnpj).toBe("12345678000199");
  });
});
