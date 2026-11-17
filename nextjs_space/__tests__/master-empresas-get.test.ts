/**
 * @jest-environment node
 *
 * Teste unitario do endpoint GET /api/master/empresas.
 * Valida RBAC master, isolamento de admins por empresa, mascaramento de email
 * e ausencia de vazamento de credenciais/email bruto.
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
    },
  },
}));

jest.mock("@/lib/asaas", () => ({
  asaas: {},
}));

import { getServerSession } from "next-auth";
import { prisma } from "@/lib/db";
import { GET } from "@/app/api/master/empresas/route";

const sessaoMock = getServerSession as jest.Mock;
const findManyMock = prisma.empresa.findMany as jest.Mock;

describe("GET /api/master/empresas - RBAC e adminsFaturamento", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("bloqueia acesso sem sessao (403)", async () => {
    sessaoMock.mockResolvedValue(null);

    const res = await GET();
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain("Acesso negado");
  });

  it("bloqueia acesso para usuario que nao seja role master (403)", async () => {
    sessaoMock.mockResolvedValue({
      user: { id: "u-admin", email: "admin@empresa.com", role: "admin" },
    });

    const res = await GET();
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain("Acesso negado");
  });

  it("permite usuario master e inclui filtro de role admin no include de users", async () => {
    sessaoMock.mockResolvedValue({
      user: { id: "u-master", email: "master@flowpdv.com", role: "master" },
    });

    findManyMock.mockResolvedValue([
      {
        id: "emp-1",
        nome: "Adega FreeStyle Drinks",
        sales: [],
        users: [
          { id: "adm-1", name: "Admin 1", email: "joao.silva@empresa.com" },
          { id: "adm-2", name: "Admin 2", email: "adega.drinks@gmail.com" },
        ],
        _count: { products: 10, sales: 5, users: 3 },
      },
    ]);

    const res = await GET();
    expect(res.status).toBe(200);

    // Verifica que prisma.findMany pediu apenas role: "admin"
    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          users: expect.objectContaining({
            where: { role: "admin" },
            select: { id: true, name: true, email: true },
          }),
        }),
      }),
    );
  });

  it("isola admins por empresa e mascara email sem serializar email bruto", async () => {
    sessaoMock.mockResolvedValue({
      user: { id: "u-master", email: "master@flowpdv.com", role: "master" },
    });

    findManyMock.mockResolvedValue([
      {
        id: "emp-adega",
        nome: "Adega FreeStyle Drinks",
        sales: [],
        users: [
          { id: "adm-1", name: "Admin 1", email: "joao@empresa.com" },
          { id: "adm-2", name: "Admin 2", email: "admin@gmail.com" },
        ],
        _count: { products: 10, sales: 5, users: 3 },
      },
      {
        id: "emp-outra",
        nome: "Outra Empresa Ltda",
        sales: [],
        users: [
          { id: "adm-3", name: "Admin 3", email: "contato@outra.com" },
        ],
        _count: { products: 2, sales: 1, users: 1 },
      },
    ]);

    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data).toHaveLength(2);

    // Empresa 1: Adega
    const adega = data.find((e: any) => e.id === "emp-adega");
    expect(adega.adminsFaturamento).toHaveLength(2);
    expect(adega.adminsFaturamento).toEqual([
      {
        id: "adm-1",
        nome: "Admin 1",
        emailMascarado: "jo**@empresa.com",
      },
      {
        id: "adm-2",
        nome: "Admin 2",
        emailMascarado: "ad***@gmail.com",
      },
    ]);

    // Empresa 2: Outra Empresa
    const outra = data.find((e: any) => e.id === "emp-outra");
    expect(outra.adminsFaturamento).toHaveLength(1);
    expect(outra.adminsFaturamento).toEqual([
      {
        id: "adm-3",
        nome: "Admin 3",
        emailMascarado: "co*****@outra.com",
      },
    ]);

    // Seguranca: array bruto de users nao deve existir no retorno
    expect(adega.users).toBeUndefined();
    expect(outra.users).toBeUndefined();

    // Nenhum email nao mascarado presente no payload serializado
    const rawJson = JSON.stringify(data);
    expect(rawJson).not.toContain("joao@empresa.com");
    expect(rawJson).not.toContain("admin@gmail.com");
    expect(rawJson).not.toContain("contato@outra.com");
  });
});
