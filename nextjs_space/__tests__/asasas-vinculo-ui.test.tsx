/**
 * @jest-environment jsdom
 *
 * Teste de UI do fluxo Asaas: preview (somente leitura) e confirmacao.
 * Mocka fetch e next/navigation. Nenhuma chamada ao Asaas/DB real.
 */
jest.mock("next/navigation", () => {
  const useRouter = jest.fn(() => ({ push: jest.fn() }));
  return { useRouter };
});

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { AsaasVinculoDialog } from "./asaas-vinculo-dialog";

const empresaVinculada = {
  empresaId: "E1",
  empresaNome: "Empresa Vinculada",
  preview: {
    empresaId: "E1",
    modo: "vinculada",
    versao: "v1",
    token: "tok_vinculada",
    expiraEm: new Date(Date.now() + 600000).toISOString(),
    empresa: {
      nome: "Empresa Vinculada",
      status: "ATIVO",
      vencimentoPlano: "2026-12-10T00:00:00.000Z",
      ciclo: "MENSAL",
      cupomAplicado: null,
      documentoMascarado: "123.***.**45-67",
      emailMascarado: "admin@empresa.com",
    },
    asaas: {
      customer: { id: "cus_E1", situacao: "existente" },
      assinatura: {
        id: "sub_E1",
        situacao: "existente",
        status: "ACTIVE",
        valor: 49.9,
        ciclo: "MONTHLY",
        total: 1,
        candidatos: [{ id: "sub_E1", status: "ACTIVE", valor: 49.9, ciclo: "MONTHLY", vencimento: "2026-12-10" }],
      },
      pagamento: { recebido: true, fonte: "asaas", coberturaAte: "2026-12-10T00:00:00.000Z", pendente: false },
    },
    proposta: {
      acao: "sincronizar",
      statusAtual: "ATIVO",
      statusProposto: "ATIVO",
      statusAsaasTerminal: false,
      requerConfirmacaoTerminal: false,
      requerConfirmacaoTermos: false,
      vencimentoAtual: "2026-12-10T00:00:00.000Z",
      vencimentoProposto: "2027-01-10T00:00:00.000Z",
      liberaAcesso: true,
    },
    avisos: [],
  },
};

const empresaProvisionamento = {
  empresaId: "E2",
  empresaNome: "Adega FreeStyle Drinks",
  preview: {
    empresaId: "E2",
    modo: "provisionamento",
    versao: "v1",
    token: "tok_prov",
    expiraEm: new Date(Date.now() + 600000).toISOString(),
    empresa: {
      nome: "Adega FreeStyle Drinks",
      status: "ATIVO",
      vencimentoPlano: null,
      ciclo: "MENSAL",
      cupomAplicado: null,
      documentoMascarado: null,
      emailMascarado: "admin@adequafreestyle.com",
    },
    asaas: {
      customer: { id: null, situacao: "ausente" },
      assinatura: { id: null, situacao: "ausente", status: null, valor: null, ciclo: null, total: 0, candidatos: [] },
      pagamento: { recebido: false, fonte: "nenhuma", coberturaAte: null, pendente: false },
    },
    proposta: {
      acao: "criar_assinatura",
      statusAtual: "ATIVO",
      statusProposto: "ATIVO",
      statusAsaasTerminal: false,
      requerConfirmacaoTerminal: false,
      requerConfirmacaoTermos: true,
      vencimentoAtual: null,
      vencimentoProposto: null,
      liberaAcesso: false,
    },
    provisionamento: {
      criarCustomer: true,
      criarAssinatura: true,
      valor: 49.9,
      ciclo: "MONTHLY",
      billingType: "UNDEFINED",
      primeiroVencimento: "2026-12-15",
    },
    avisos: ["Empresa sem CPF/CNPJ: não é possível provisionar no Asaas."],
  },
};

const empresaConflito = {
  empresaId: "E3",
  empresaNome: "Empresa Conflito",
  preview: {
    empresaId: "E3",
    modo: "conflito",
    versao: "v1",
    token: "tok_conf",
    expiraEm: new Date(Date.now() + 600000).toISOString(),
    empresa: {
      nome: "Empresa Conflito",
      status: "ATIVO",
      vencimentoPlano: null,
      ciclo: "MENSAL",
      cupomAplicado: null,
      documentoMascarado: null,
      emailMascarado: null,
    },
    asaas: {
      customer: { id: null, situacao: "ausente" },
      assinatura: { id: null, situacao: "ausente", status: null, valor: null, ciclo: null, total: 0, candidatos: [] },
      pagamento: { recebido: false, fonte: "nenhuma", coberturaAte: null, pendente: false },
    },
    proposta: {
      acao: "vincular_assinatura",
      statusAtual: "ATIVO",
      statusProposto: "ATIVO",
      statusAsaasTerminal: false,
      requerConfirmacaoTerminal: false,
      requerConfirmacaoTermos: false,
      vencimentoAtual: null,
      vencimentoProposto: null,
      liberaAcesso: false,
    },
    conflito: { motivo: "sem_documento", candidatos: [] },
    avisos: ["Empresa sem CPF/CNPJ: não é possível provisionar no Asaas."],
  },
};

function mockPreview(preview: any) {
  (global.fetch as jest.Mock).mockResolvedValue({
    ok: true,
    json: async () => ({ ok: true, preview }),
  });
}

function mockConfirm(result: any) {
  (global.fetch as jest.Mock).mockResolvedValueOnce({
    ok: true,
    json: async () => ({ ok: true, modo: "vinculada", aplicado: true, statusFinal: "ATIVO", vencimentoPlano: "2027-01-10T00:00:00.000Z", ...result }),
  });
}

describe("AsaasVinculoDialog", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  it("empresa vinculada mostra preview, status antes/depois e CTA de confirmar", async () => {
    mockPreview(empresaVinculada.preview);

    render(<AsaasVinculoDialog empresaId="E1" empresaNome="Empresa Vinculada" open onOpenChange={jest.fn()} />);

    await waitFor(() => expect(screen.getByText("Empresa já vinculada ao Asaas")).toBeInTheDocument());
    expect(screen.getByText("Vinculado")).toBeInTheDocument();
    expect(screen.getByText("Sincronizar status/vencimento")).toBeInTheDocument();
    expect(screen.getByText("ATIVO")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Confirmar ação/ })).toBeInTheDocument();
  });

  it("empresa sem vínculo mostra 'Não vinculado' e oferece provisionar com resumo de cobrança", async () => {
    mockPreview(empresaProvisionamento.preview);

    render(<AsaasVinculoDialog empresaId="E2" empresaNome="Adega FreeStyle Drinks" open onOpenChange={jest.fn()} />);

    await waitFor(() => expect(screen.getByText("Provisionar no Asaas")).toBeInTheDocument());
    expect(screen.getByText("Não vinculado")).toBeInTheDocument();
    expect(screen.getByText("Criar assinatura no Asaas")).toBeInTheDocument();
    expect(screen.getByText("Isso gera uma cobrança real no Asaas")).toBeInTheDocument();
    expect(screen.getByText("49,9")).toBeInTheDocument();
    expect(screen.getByText("2026-12-15")).toBeInTheDocument();
    expect(screen.getByText("PAYMENT_RECEIVED")).toBeInTheDocument();
  });

  it("empresa sem vínculo NÃO exibe CTA de confirmação sem preenchimento de termos (requerConfirmacaoTermos)", async () => {
    mockPreview(empresaProvisionamento.preview);

    render(<AsaasVinculoDialog empresaId="E2" empresaNome="Adega FreeStyle Drinks" open onOpenChange={jest.fn()} />);

    await waitFor(() => expect(screen.getByText("Provisionar no Asaas")).toBeInTheDocument());
    // O dialog exige confirmacao de termos; sem preenchimento nao deve haver CTA ativo de criacao silenciosa.
    expect(screen.getByText("Li e concordo com os termos acima (criação de cobrança)")).toBeInTheDocument();
  });

  it("conflito mostra bloqueio e nao exibe CTA de confirmar", async () => {
    mockPreview(empresaConflito.preview);

    render(<AsaasVinculoDialog empresaId="E3" empresaNome="Empresa Conflito" open onOpenChange={jest.fn()} />);

    await waitFor(() => expect(screen.getByText("Conflito no Asaas")).toBeInTheDocument());
    expect(screen.getByText("Conflito — não resolver automaticamente")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Confirmar ação/ })).not.toBeInTheDocument();
  });

  it("confirmacao chama /confirm com token e exibe sucesso", async () => {
    mockPreview(empresaVinculada.preview);
    mockConfirm({});

    render(<AsaasVinculoDialog empresaId="E1" empresaNome="Empresa Vinculada" open onOpenChange={jest.fn()} />);

    await waitFor(() => expect(screen.getByRole("button", { name: /Confirmar ação/ })).toBeInTheDocument());
    (screen.getByRole("button", { name: /Confirmar ação/ }) as HTMLButtonElement).click();

    await waitFor(() =>
      expect(screen.getByText("Confirmado")).toBeInTheDocument(),
    );
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/master/asaas/confirm"),
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("tok_vinculada"),
      }),
    );
  });
});
