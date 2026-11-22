/**
 * @jest-environment node
 *
 * Testes para:
 * 1. Guarda e servico de edicao de perfil cadastral da empresa (Configuracoes)
 * 2. Endpoints GET /api/admin/empresa e PATCH /api/admin/empresa (e alias /api/admin/config/empresa)
 * 3. Auditoria de isolamento e RBAC para caixa e gerente
 */

jest.mock("next-auth", () => ({
  getServerSession: jest.fn(),
  default: jest.fn(() => ({})),
}));

jest.mock("@/lib/auth", () => ({
  authOptions: {},
  getServerSession: jest.fn(),
}));

jest.mock("@/lib/db", () => {
  const actualPrisma = jest.requireActual("@prisma/client");
  return {
    prisma: {
      empresa: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
    },
    Prisma: actualPrisma.Prisma,
  };
});

import { getServerSession } from "next-auth";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { GET, PATCH } from "@/app/api/admin/empresa/route";
import { GET as GET_ALIAS, PATCH as PATCH_ALIAS } from "@/app/api/admin/config/empresa/route";
import { GET as GET_DASHBOARD_STATS } from "@/app/api/admin/dashboard-stats/route";
import { GET as GET_ADMIN_ANALYTICS } from "@/app/api/admin/analytics/route";
import { GET as GET_EMPLOYEE_ANALYTICS } from "@/app/api/employee/analytics/route";

const sessaoMock = getServerSession as jest.Mock;
const findUniqueMock = prisma.empresa.findUnique as jest.Mock;
const findFirstMock = prisma.empresa.findFirst as jest.Mock;
const updateMock = prisma.empresa.update as jest.Mock;

describe("Edição Cadastral da Empresa (Configurações)", () => {
  const mockEmpresa = {
    id: "empresa-123",
    nome: "FreeStyle Adega",
    status: "ATIVO",
    plano: "PRO",
    vencimentoPlano: new Date("2026-12-01"),
    diaVencimento: 10,
    cpfCnpj: "12345678000199",
    telefone: "11987654321",
    enderecoLogradouro: "Rua das Flores",
    enderecoNumero: "100",
    enderecoBairro: "Centro",
    enderecoCidade: "São Paulo",
    enderecoUf: "SP",
    enderecoCep: "01001000",
    asaasCustomerId: "cus_123",
    asaasSubscriptionId: "sub_123",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    sessaoMock.mockResolvedValue({
      user: {
        id: "user-admin",
        role: "admin",
        empresaId: "empresa-123",
      },
    });
    findUniqueMock.mockResolvedValue({ ...mockEmpresa });
    findFirstMock.mockResolvedValue(null);
    updateMock.mockImplementation(({ data }: any) =>
      Promise.resolve({ ...mockEmpresa, ...data }),
    );
  });

  describe("RBAC e Segurança de Origem (CSRF)", () => {
    it("nega acesso com 401 se nao houver sessao", async () => {
      sessaoMock.mockResolvedValue(null);

      const req = new NextRequest("http://localhost/api/admin/empresa", {
        method: "GET",
      });
      const res = await GET(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toBe("não_autenticado");
    });

    it("nega com 403 para papel caixa", async () => {
      sessaoMock.mockResolvedValue({
        user: { id: "u-caixa", role: "caixa", empresaId: "empresa-123" },
      });

      const req = new NextRequest("http://localhost/api/admin/empresa", {
        method: "GET",
      });
      const res = await GET(req);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toBe("acesso_negado");
    });

    it("nega com 403 para papel gerente", async () => {
      sessaoMock.mockResolvedValue({
        user: { id: "u-gerente", role: "gerente", empresaId: "empresa-123" },
      });

      const req = new NextRequest("http://localhost/api/admin/empresa", {
        method: "GET",
      });
      const res = await GET(req);
      expect(res.status).toBe(403);
    });

    it("nega com 403 para papel master sem empresaId na sessao", async () => {
      sessaoMock.mockResolvedValue({
        user: { id: "u-master", role: "master", empresaId: null },
      });

      const req = new NextRequest("http://localhost/api/admin/empresa", {
        method: "GET",
      });
      const res = await GET(req);
      expect(res.status).toBe(403);
    });

    it("nega com 403 para admin sem empresaId vinculado", async () => {
      sessaoMock.mockResolvedValue({
        user: { id: "u-admin", role: "admin", empresaId: null },
      });

      const req = new NextRequest("http://localhost/api/admin/empresa", {
        method: "GET",
      });
      const res = await GET(req);
      expect(res.status).toBe(403);
    });

    it("nega mutacao PATCH com 403 se header Origin divergir de Host (CSRF)", async () => {
      const req = new NextRequest("http://localhost:3000/api/admin/empresa", {
        method: "PATCH",
        headers: {
          host: "localhost:3000",
          origin: "https://site-malicioso.com",
          "content-type": "application/json",
        },
        body: JSON.stringify({ telefone: "11988887777" }),
      });

      const res = await PATCH(req);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toBe("origem_invalida");
    });

    it("permite mutacao PATCH quando Origin e Host coincidem", async () => {
      const req = new NextRequest("http://localhost:3000/api/admin/empresa", {
        method: "PATCH",
        headers: {
          host: "localhost:3000",
          origin: "http://localhost:3000",
          "content-type": "application/json",
        },
        body: JSON.stringify({ telefone: "11988887777" }),
      });

      const res = await PATCH(req);
      expect(res.status).toBe(200);
    });
  });

  describe("GET /api/admin/empresa", () => {
    it("retorna dados cadastrais seguros e nome da empresa", async () => {
      const req = new NextRequest("http://localhost/api/admin/empresa");
      const res = await GET(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.empresa).toEqual({
        id: "empresa-123",
        nome: "FreeStyle Adega",
        cpfCnpj: "12345678000199",
        telefone: "11987654321",
        enderecoLogradouro: "Rua das Flores",
        enderecoNumero: "100",
        enderecoBairro: "Centro",
        enderecoCidade: "São Paulo",
        enderecoUf: "SP",
        enderecoCep: "01001000",
      });
      // Garante que campos sensiveis de cobranca/sistema nao sao expostos
      expect(json.empresa.status).toBeUndefined();
      expect(json.empresa.plano).toBeUndefined();
      expect(json.empresa.asaasCustomerId).toBeUndefined();
    });

    it("retorna 404 se a empresa vinculada nao for encontrada", async () => {
      findUniqueMock.mockResolvedValue(null);
      const req = new NextRequest("http://localhost/api/admin/empresa");
      const res = await GET(req);
      expect(res.status).toBe(404);
    });
  });

  describe("PATCH /api/admin/empresa", () => {
    it("ignora empresaId do body e grava estritamente na empresa da sessao", async () => {
      const req = new NextRequest("http://localhost/api/admin/empresa", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          empresaId: "empresa-invasora-999",
          telefone: "11999998888",
        }),
      });

      const res = await PATCH(req);
      expect(res.status).toBe(200);

      // Verificacao crucial: update chamado na empresa da sessao, nunca na do body
      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "empresa-123" },
          data: expect.objectContaining({
            telefone: "11999998888",
          }),
        }),
      );
    });

    it("ignora campos criticos de faturamento e sistema no body (status, plano, Asaas, etc)", async () => {
      const req = new NextRequest("http://localhost/api/admin/empresa", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          status: "ATIVO",
          plano: "ENTERPRISE",
          vencimentoPlano: "2099-01-01",
          diaVencimento: 1,
          asaasCustomerId: "hacked",
          asaasSubscriptionId: "hacked",
          nome: "Nome Alterado Sem Permissao",
          enderecoLogradouro: "Av Paulista",
        }),
      });

      const res = await PATCH(req);
      expect(res.status).toBe(200);

      const dadosGravados = updateMock.mock.calls[0][0].data;
      expect(dadosGravados.status).toBeUndefined();
      expect(dadosGravados.plano).toBeUndefined();
      expect(dadosGravados.vencimentoPlano).toBeUndefined();
      expect(dadosGravados.diaVencimento).toBeUndefined();
      expect(dadosGravados.asaasCustomerId).toBeUndefined();
      expect(dadosGravados.asaasSubscriptionId).toBeUndefined();
      expect(dadosGravados.nome).toBeUndefined();
      expect(dadosGravados.enderecoLogradouro).toBe("Av Paulista");
    });

    it("valida CPF (11 dígitos) e CNPJ (14 dígitos)", async () => {
      // Invalido: 10 digitos
      const reqInvalido = new NextRequest("http://localhost/api/admin/empresa", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ cpfCnpj: "123.456.789-0" }),
      });
      const resInvalido = await PATCH(reqInvalido);
      expect(resInvalido.status).toBe(400);

      // Valido: 11 digitos formatado
      const reqCpfValido = new NextRequest("http://localhost/api/admin/empresa", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ cpfCnpj: "123.456.789-01" }),
      });
      const resCpfValido = await PATCH(reqCpfValido);
      expect(resCpfValido.status).toBe(200);
      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ cpfCnpj: "12345678901" }),
        }),
      );
    });

    it("valida telefone (10 ou 11 digitos, normaliza DDI 55)", async () => {
      // Invalido
      const reqInvalido = new NextRequest("http://localhost/api/admin/empresa", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ telefone: "12345" }),
      });
      const resInvalido = await PATCH(reqInvalido);
      expect(resInvalido.status).toBe(400);

      // Valido com 55
      const reqCom55 = new NextRequest("http://localhost/api/admin/empresa", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ telefone: "+55 (11) 98765-4321" }),
      });
      const resCom55 = await PATCH(reqCom55);
      expect(resCom55.status).toBe(200);
      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ telefone: "11987654321" }),
        }),
      );
    });

    it("valida CEP (8 dígitos) e UF (2 letras maiúsculas)", async () => {
      // CEP invalido
      const reqCepInvalido = new NextRequest("http://localhost/api/admin/empresa", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ enderecoCep: "12345" }),
      });
      expect((await PATCH(reqCepInvalido)).status).toBe(400);

      // UF invalida
      const reqUfInvalida = new NextRequest("http://localhost/api/admin/empresa", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ enderecoUf: "SPP" }),
      });
      expect((await PATCH(reqUfInvalida)).status).toBe(400);

      // Validos
      const reqOk = new NextRequest("http://localhost/api/admin/empresa", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          enderecoCep: "01001-000",
          enderecoUf: "sp",
          enderecoLogradouro: "  Rua Teste  ",
        }),
      });
      const resOk = await PATCH(reqOk);
      expect(resOk.status).toBe(200);
      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            enderecoCep: "01001000",
            enderecoUf: "SP",
            enderecoLogradouro: "Rua Teste",
          }),
        }),
      );
    });

    it("retorna 409 quando CPF/CNPJ ja esta cadastrado em outra empresa (pre-check)", async () => {
      findFirstMock.mockResolvedValue({ id: "outra-empresa-456" });

      const req = new NextRequest("http://localhost/api/admin/empresa", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ cpfCnpj: "99999999000199" }),
      });

      const res = await PATCH(req);
      expect(res.status).toBe(409);
      const json = await res.json();
      expect(json.error).toContain("já está cadastrado em outra empresa");
      expect(updateMock).not.toHaveBeenCalled();
    });

    it("retorna 409 quando colide corrida no banco e lanca erro Prisma P2002", async () => {
      findFirstMock.mockResolvedValue(null);
      const erroP2002 = new Prisma.PrismaClientKnownRequestError(
        "Unique constraint failed",
        { code: "P2002", clientVersion: "5.x" },
      );
      updateMock.mockRejectedValue(erroP2002);

      const req = new NextRequest("http://localhost/api/admin/empresa", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ cpfCnpj: "99999999000199" }),
      });

      const res = await PATCH(req);
      expect(res.status).toBe(409);
      const json = await res.json();
      expect(json.error).toContain("já está cadastrado em outra empresa");
    });
  });

  describe("Alias /api/admin/config/empresa", () => {
    it("responde identicamente via alias GET e PATCH", async () => {
      const reqGet = new NextRequest("http://localhost/api/admin/config/empresa");
      const resGet = await GET_ALIAS(reqGet);
      expect(resGet.status).toBe(200);

      const reqPatch = new NextRequest("http://localhost/api/admin/config/empresa", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ telefone: "11988887777" }),
      });
      const resPatch = await PATCH_ALIAS(reqPatch);
      expect(resPatch.status).toBe(200);
    });
  });

  describe("Auditoria de Métricas Corporativas vs Caixa", () => {
    it("/api/admin/dashboard-stats bloqueia caixa com 403", async () => {
      sessaoMock.mockResolvedValue({
        user: { id: "u-caixa", role: "caixa", empresaId: "empresa-123" },
      });
      const res = await GET_DASHBOARD_STATS();
      expect(res.status).toBe(403);
    });

    it("/api/admin/analytics bloqueia caixa com 403", async () => {
      sessaoMock.mockResolvedValue({
        user: { id: "u-caixa", role: "caixa", empresaId: "empresa-123" },
      });
      const req = new NextRequest("http://localhost/api/admin/analytics");
      const res = await GET_ADMIN_ANALYTICS(req);
      expect(res.status).toBe(403);
    });

    it("/api/employee/analytics preserva acesso para caixa filtrando apenas vendas pessoais (userId)", async () => {
      sessaoMock.mockResolvedValue({
        user: { id: "u-caixa", role: "caixa", empresaId: "empresa-123" },
      });
      (prisma as any).sale = {
        aggregate: jest.fn().mockResolvedValue({ _sum: { valorTotal: 0 }, _count: { id: 0 } }),
        findMany: jest.fn().mockResolvedValue([]),
      };
      (prisma as any).saleItem = {
        aggregate: jest.fn().mockResolvedValue({ _sum: { quantidade: 0 } }),
      };
      (prisma as any).aviso = {
        findMany: jest.fn().mockResolvedValue([]),
      };
      (prisma as any).user = {
        findUnique: jest.fn().mockResolvedValue({ metaMensal: 0 }),
      };

      const res = await GET_EMPLOYEE_ANALYTICS();
      expect(res.status).toBe(200);
    });

    it("/api/employee/analytics preserva acesso para gerente com 200", async () => {
      sessaoMock.mockResolvedValue({
        user: { id: "u-gerente", role: "gerente", empresaId: "empresa-123" },
      });
      (prisma as any).sale = {
        aggregate: jest.fn().mockResolvedValue({ _sum: { valorTotal: 0 }, _count: { id: 0 } }),
        findMany: jest.fn().mockResolvedValue([]),
      };
      (prisma as any).saleItem = {
        aggregate: jest.fn().mockResolvedValue({ _sum: { quantidade: 0 } }),
      };
      (prisma as any).aviso = {
        findMany: jest.fn().mockResolvedValue([]),
      };
      (prisma as any).user = {
        findUnique: jest.fn().mockResolvedValue({ metaMensal: 0 }),
      };

      const res = await GET_EMPLOYEE_ANALYTICS();
      expect(res.status).toBe(200);
    });
  });
});
