/**
 * @jest-environment node
 *
 * Teste de contrato da rota POST /api/master/asaas/preview e do servico cliente asaas-vinculo-service.
 * Valida:
 *  - 409 conflito_vinculo com motivo multiplos_admins_selecao_obrigatoria e array admins;
 *  - 200 com modo conflito e motivo sem_documento apos selecao de admin em empresa sem CPF/CNPJ;
 *  - asaas-vinculo-service convertendo resposta 409 em AsaasPreviewError preservando admins e codigo tipado.
 */

jest.mock("next-auth", () => ({
  getServerSession: jest.fn(),
  default: jest.fn(() => ({})),
}));

jest.mock("@/lib/auth", () => ({
  authOptions: {},
  getServerSession: jest.fn(),
}));

jest.mock("@/lib/master-asaas", () => ({
  montarPreview: jest.fn(),
}));

import { getServerSession } from "next-auth";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/master/asaas/preview/route";
import { montarPreview } from "@/lib/master-asaas";
import {
  montarPreviewAsaas,
  AsaasPreviewError,
} from "@/app/master/empresas/_components/parts/asaas-vinculo-service";

const sessaoMock = getServerSession as jest.Mock;
const montarPreviewMock = montarPreview as jest.Mock;

describe("POST /api/master/asaas/preview (contrato da rota e serviço)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sessaoMock.mockResolvedValue({
      user: { id: "master-1", role: "master" },
    });
  });

  it("bloqueia requisicao sem perfil master (403)", async () => {
    sessaoMock.mockResolvedValue({
      user: { id: "user-1", role: "admin" },
    });

    const req = new NextRequest("http://localhost/api/master/asaas/preview", {
      method: "POST",
      body: JSON.stringify({ empresaId: "E1" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.erro).toBe("acesso_negado");
  });

  it("retorna 400 se empresaId nao for fornecido", async () => {
    const req = new NextRequest("http://localhost/api/master/asaas/preview", {
      method: "POST",
      body: JSON.stringify({}),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.erro).toBe("empresaId_obrigatorio");
  });

  it("retorna 409 conflito_vinculo com motivo multiplos_admins e repassa array admins", async () => {
    const adminsLista = [
      { id: "A1", nome: "Admin 1", emailMascarado: "ad***1@empresa.com" },
      { id: "A2", nome: "Admin 2", emailMascarado: "ad***2@empresa.com" },
    ];

    montarPreviewMock.mockResolvedValue({
      ok: false,
      http: 409,
      erro: "conflito_vinculo",
      motivo: "multiplos_admins_selecao_obrigatoria",
      admins: adminsLista,
    });

    const req = new NextRequest("http://localhost/api/master/asaas/preview", {
      method: "POST",
      body: JSON.stringify({ empresaId: "E1" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.erro).toBe("conflito_vinculo");
    expect(body.motivo).toBe("multiplos_admins_selecao_obrigatoria");
    expect(body.admins).toEqual(adminsLista);
  });

  it("retorna 200 modo conflito com motivo sem_documento apos selecao de admin", async () => {
    montarPreviewMock.mockResolvedValue({
      ok: true,
      preview: {
        empresaId: "E1",
        modo: "conflito",
        conflito: { motivo: "sem_documento", candidatos: [] },
        proposta: {
          acao: "criar_assinatura",
          statusAtual: "PENDENTE",
          statusProposto: "PENDENTE",
          liberaAcesso: false,
        },
        empresa: {
          id: "E1",
          nome: "Adega FreeStyle Drinks",
          adminId: "A2",
          documentoMascarado: null,
        },
      },
    });

    const req = new NextRequest("http://localhost/api/master/asaas/preview", {
      method: "POST",
      body: JSON.stringify({ empresaId: "E1", adminId: "A2" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.preview.modo).toBe("conflito");
    expect(body.preview.conflito.motivo).toBe("sem_documento");
    expect(body.preview.empresa.adminId).toBe("A2");
  });
});

describe("asaas-vinculo-service (cliente frontend)", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("montarPreviewAsaas lanca AsaasPreviewError preservando admins em 409 conflito_vinculo", async () => {
    const adminsLista = [
      { id: "A1", nome: "Admin 1", emailMascarado: "ad***1@empresa.com" },
      { id: "A2", nome: "Admin 2", emailMascarado: "ad***2@empresa.com" },
    ];

    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({
        ok: false,
        erro: "conflito_vinculo",
        motivo: "multiplos_admins_selecao_obrigatoria",
        admins: adminsLista,
      }),
    });

    await expect(montarPreviewAsaas("E1")).rejects.toThrow(AsaasPreviewError);

    try {
      await montarPreviewAsaas("E1");
    } catch (err) {
      expect(err).toBeInstanceOf(AsaasPreviewError);
      const e = err as AsaasPreviewError;
      expect(e.codigo).toBe("multiplos_admins_selecao_obrigatoria");
      expect(e.admins).toEqual(adminsLista);
    }
  });

  it("montarPreviewAsaas retorna preview com conflito sem_documento apos selecao de admin", async () => {
    const previewConflito = {
      empresaId: "E1",
      modo: "conflito",
      conflito: { motivo: "sem_documento", candidatos: [] },
      empresa: { id: "E1", adminId: "A2" },
    };

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        ok: true,
        preview: previewConflito,
      }),
    });

    const res = await montarPreviewAsaas("E1", undefined, "A2");
    expect(res.modo).toBe("conflito");
    expect(res.conflito?.motivo).toBe("sem_documento");
  });
});
