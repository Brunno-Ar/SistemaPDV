/**
 * @jest-environment node
 */

import { GET as GET_EMPLOYEE_ANALYTICS } from "@/app/api/employee/analytics/route";
import { GET as GET_ONBOARDING_STATUS } from "@/app/api/employee/onboarding-status/route";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/db";

jest.mock("next-auth", () => ({
  getServerSession: jest.fn(),
}));

jest.mock("@/lib/auth", () => ({
  authOptions: {},
}));

jest.mock("@/lib/db", () => ({
  prisma: {
    sale: {
      aggregate: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    saleItem: {
      aggregate: jest.fn(),
    },
    aviso: {
      findMany: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  },
}));

describe("RBAC de Métricas e Status de Onboarding do Funcionário", () => {
  const sessaoMock = getServerSession as jest.MockedFunction<typeof getServerSession>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/employee/analytics", () => {
    it("nega acesso com 401 para requisição sem sessão", async () => {
      sessaoMock.mockResolvedValue(null);
      const res = await GET_EMPLOYEE_ANALYTICS();
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toBe("Unauthorized");
    });

    it("bloqueia caixa com 403 antes de consultar dados", async () => {
      sessaoMock.mockResolvedValue({
        user: { id: "u-caixa", role: "caixa", empresaId: "emp-1" },
      });
      const res = await GET_EMPLOYEE_ANALYTICS();
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toMatch(/Acesso negado/);
      expect(prisma.sale.aggregate).not.toHaveBeenCalled();
      expect(prisma.sale.findMany).not.toHaveBeenCalled();
    });

    it("falha fechada com 403 para role inválido ou indefinido", async () => {
      sessaoMock.mockResolvedValue({
        user: { id: "u-invalido", role: "visitante", empresaId: "emp-1" } as any,
      });
      const res = await GET_EMPLOYEE_ANALYTICS();
      expect(res.status).toBe(403);
      expect(prisma.sale.aggregate).not.toHaveBeenCalled();
    });

    it("retorna 400 se empresaId não estiver presente para papel permitido", async () => {
      sessaoMock.mockResolvedValue({
        user: { id: "u-gerente", role: "gerente", empresaId: null } as any,
      });
      const res = await GET_EMPLOYEE_ANALYTICS();
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("User not linked to a company");
    });

    it("preserva acesso 200 para papel gerente", async () => {
      sessaoMock.mockResolvedValue({
        user: { id: "u-gerente", role: "gerente", empresaId: "emp-1" },
      });
      (prisma.sale.aggregate as jest.Mock).mockResolvedValue({
        _sum: { valorTotal: 1500 },
        _count: { id: 10 },
      });
      (prisma.sale.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.saleItem.aggregate as jest.Mock).mockResolvedValue({
        _sum: { quantidade: 25 },
      });
      (prisma.aviso.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ metaMensal: 5000 });

      const res = await GET_EMPLOYEE_ANALYTICS();
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.salesToday).toBe(1500);
      expect(json.totalItemsSold).toBe(25);
      expect(json.metaMensal).toBe(5000);
    });

    it("preserva acesso 200 para papel admin", async () => {
      sessaoMock.mockResolvedValue({
        user: { id: "u-admin", role: "admin", empresaId: "emp-1" },
      });
      (prisma.sale.aggregate as jest.Mock).mockResolvedValue({
        _sum: { valorTotal: 0 },
        _count: { id: 0 },
      });
      (prisma.sale.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.saleItem.aggregate as jest.Mock).mockResolvedValue({
        _sum: { quantidade: 0 },
      });
      (prisma.aviso.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ metaMensal: 0 });

      const res = await GET_EMPLOYEE_ANALYTICS();
      expect(res.status).toBe(200);
    });

    it("preserva acesso 200 para papel master", async () => {
      sessaoMock.mockResolvedValue({
        user: { id: "u-master", role: "master", empresaId: "emp-1" },
      });
      (prisma.sale.aggregate as jest.Mock).mockResolvedValue({
        _sum: { valorTotal: 0 },
        _count: { id: 0 },
      });
      (prisma.sale.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.saleItem.aggregate as jest.Mock).mockResolvedValue({
        _sum: { quantidade: 0 },
      });
      (prisma.aviso.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ metaMensal: 0 });

      const res = await GET_EMPLOYEE_ANALYTICS();
      expect(res.status).toBe(200);
    });
  });

  describe("GET /api/employee/onboarding-status", () => {
    it("nega acesso com 401 sem sessão", async () => {
      sessaoMock.mockResolvedValue(null);
      const res = await GET_ONBOARDING_STATUS();
      expect(res.status).toBe(401);
    });

    it("retorna 400 se usuário não tiver empresaId", async () => {
      sessaoMock.mockResolvedValue({
        user: { id: "u-caixa", role: "caixa", empresaId: null } as any,
      });
      const res = await GET_ONBOARDING_STATUS();
      expect(res.status).toBe(400);
    });

    it("permite caixa e retorna hasSale: true quando há venda", async () => {
      sessaoMock.mockResolvedValue({
        user: { id: "u-caixa", role: "caixa", empresaId: "emp-1" },
      });
      (prisma.sale.findFirst as jest.Mock).mockResolvedValue({ id: "sale-1" });

      const res = await GET_ONBOARDING_STATUS();
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual({ hasSale: true });
      expect(prisma.sale.findFirst).toHaveBeenCalledWith({
        where: {
          userId: "u-caixa",
          empresaId: "emp-1",
        },
        select: {
          id: true,
        },
      });
    });

    it("permite caixa e retorna hasSale: false quando não há venda", async () => {
      sessaoMock.mockResolvedValue({
        user: { id: "u-caixa", role: "caixa", empresaId: "emp-1" },
      });
      (prisma.sale.findFirst as jest.Mock).mockResolvedValue(null);

      const res = await GET_ONBOARDING_STATUS();
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual({ hasSale: false });
    });
  });
});
