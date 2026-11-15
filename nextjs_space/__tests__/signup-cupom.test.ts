/**
 * @jest-environment node
 *
 * Teste da rota de signup (`app/api/signup/route.ts`).
 *
 * Critico (decisao do usuario): cupom 100% (preço zero) NÃO concede acesso
 * permanente. Cria EM_TESTE com `calcularVencimentoTrial()` (14d) — mesmo
 * trial de qualquer novo cadastro — e nunca ATIVO sem vencimento. Cadastro
 * normal (sem cupom ou com desconto parcial) também usa trial de 14d.
 *
 * Todos os externos mockados (Prisma, Asaas, mail, tokens, bcrypt);
 * DATABASE_URL/DIRECT_URL dummy via prisma-guard; sem conexão real, banco,
 * Asaas, env ou produção.
 */
jest.mock("next-auth", () => ({}));
jest.mock("@/lib/auth", () => ({ authOptions: {} }));

jest.mock("@/lib/db", () => ({
  prisma: {
    $transaction: jest.fn(),
    empresa: { findFirst: jest.fn() },
    user: { findUnique: jest.fn() },
    cupom: { findUnique: jest.fn(), update: jest.fn() },
    memberLink: { findUnique: jest.fn() },
    memberConversion: { create: jest.fn() },
  },
}));

jest.mock("@/lib/asaas", () => ({
  asaas: {
    findCustomerByCpfCnpj: jest.fn(),
    createCustomer: jest.fn(),
    createSubscription: jest.fn(),
    cancelSubscription: jest.fn(),
    deleteCustomer: jest.fn(),
  },
}));

jest.mock("@/lib/mail", () => ({
  sendVerificationEmail: jest.fn(),
}));

jest.mock("@/lib/tokens", () => ({
  generateVerificationToken: jest.fn(() => ({ token: "tok" })),
}));

jest.mock("bcryptjs", () => ({
  hash: jest.fn(async (_p: string) => "hash_senha"),
}));

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { asaas } from "@/lib/asaas";
import { POST } from "@/app/api/signup/route";

const txMock = prisma.$transaction as jest.Mock;
const findFirstMock = prisma.empresa.findFirst as jest.Mock;
const findUserMock = prisma.user.findUnique as jest.Mock;
const findCupomMock = prisma.cupom.findUnique as jest.Mock;
const updateCupomMock = prisma.cupom.update as jest.Mock;
const findLinkMock = prisma.memberLink.findUnique as jest.Mock;
const createConvMock = prisma.memberConversion.create as jest.Mock;
const findCustomerMock = asaas.findCustomerByCpfCnpj as jest.Mock;
const createCustomerMock = asaas.createCustomer as jest.Mock;
const createSubMock = asaas.createSubscription as jest.Mock;
const sendMailMock = require("@/lib/mail").sendVerificationEmail as jest.Mock;

const baseBody = {
  email: "novo@exemplo.com",
  password: "Senha123",
  nome: "Novo Usuario",
  nomeEmpresa: "Empresa Nova",
  telefone: "11999999999",
  cpfCnpj: "12345678901",
  termsAccepted: true,
  logradouro: "Rua A",
  numero: "100",
  bairro: "Centro",
  cep: "01000-000",
  cidade: "São Paulo",
  uf: "SP",
};

function post(body: Record<string, unknown>) {
  return POST(
    new NextRequest("http://localhost/api/signup", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  );
}

let ultimoTx: any = null;

beforeEach(() => {
  jest.clearAllMocks();
  findUserMock.mockResolvedValue(null);
  findFirstMock.mockResolvedValue(null);
  findCupomMock.mockResolvedValue(null);
  findCustomerMock.mockResolvedValue(null);
  createCustomerMock.mockResolvedValue({ id: "cus_1", name: "x", email: "e", cpfCnpj: "c" });
  createSubMock.mockResolvedValue({ id: "sub_1", customerId: "cus_1", value: 49.9, nextDueDate: "2026-12-01", cycle: "MENSAL", status: "ACTIVE" });
  sendMailMock.mockResolvedValue(undefined);
  txMock.mockImplementation(async (cb: any) => {
    const tx = {
      empresa: { create: jest.fn(async (d: any) => ({ id: "emp_1", ...d })) },
      user: { create: jest.fn(async (d: any) => ({ id: "usr_1", ...d })) },
      cupom: { update: jest.fn(async () => ({})) },
      memberLink: { findUnique: jest.fn(async () => null) },
      memberConversion: { create: jest.fn(async () => ({})) },
    };
    ultimoTx = tx;
    return cb(tx);
  });
});

it("cupom 100% (preço zero): EM_TESTE + trial 14d, nunca ATIVO sem vencimento", async () => {
  const cupomDb = {
    codigo: "GRATIS100",
    descontoPorcentagem: 100,
    validoAte: null,
    usosAtuais: 0,
    limiteUsos: null,
  };
  findCupomMock.mockResolvedValue(cupomDb);

  const res = await post({ ...baseBody, cupom: "GRATIS100" });

  const corpo = await res.json();
  expect([200, 201]).toContain(res.status);
  expect(corpo.success).toBe(true);

  // A transação recebeu status EM_TESTE e vencimento de trial (não null).
  const dadosEmpresa = ultimoTx.empresa.create.mock.calls[0][0]?.data;
  expect(dadosEmpresa.status).toBe("EM_TESTE");
  expect(dadosEmpresa.vencimentoPlano).not.toBeNull();
  expect(new Date(dadosEmpresa.vencimentoPlano).getTime()).toBeGreaterThan(Date.now());
  expect(dadosEmpresa.cupomAplicado).toBe("GRATIS100");
  // Nenhuma assinatura Asaas criada para conta gratuita
  expect(createCustomerMock).not.toHaveBeenCalled();
  expect(createSubMock).not.toHaveBeenCalled();
});

it("cadastro normal sem cupom: EM_TESTE + trial 14d", async () => {
  const res = await post(baseBody);

  const corpo = await res.json();
  expect([200, 201]).toContain(res.status);
  expect(corpo.success).toBe(true);

  const dadosEmpresa = ultimoTx.empresa.create.mock.calls[0][0]?.data;
  expect(dadosEmpresa.status).toBe("EM_TESTE");
  expect(dadosEmpresa.vencimentoPlano).not.toBeNull();
  expect(dadosEmpresa.cupomAplicado).toBeNull();
  expect(createCustomerMock).toHaveBeenCalled();
  expect(createSubMock).toHaveBeenCalled();
});

it("cupom parcial (ex. 50%): EM_TESTE + trial 14d com assinatura Asaas", async () => {
  const cupomDb = {
    codigo: "MEIA",
    descontoPorcentagem: 50,
    validoAte: null,
    usosAtuais: 0,
    limiteUsos: null,
  };
  findCupomMock.mockResolvedValue(cupomDb);

  const res = await post({ ...baseBody, cupom: "MEIA" });

  const corpo = await res.json();
  expect([200, 201]).toContain(res.status);
  expect(corpo.success).toBe(true);

  const dadosEmpresa = ultimoTx.empresa.create.mock.calls[0][0]?.data;
  expect(dadosEmpresa.status).toBe("EM_TESTE");
  expect(dadosEmpresa.vencimentoPlano).not.toBeNull();
  expect(createCustomerMock).toHaveBeenCalled();
  expect(createSubMock).toHaveBeenCalled();
});

it("email duplicado: 400 sem criar", async () => {
  findUserMock.mockResolvedValue({ id: "usr_existente" });

  const res = await post(baseBody);

  expect(res.status).toBe(400);
  expect(txMock).not.toHaveBeenCalled();
});
