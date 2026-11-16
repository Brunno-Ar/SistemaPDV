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
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
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
        candidatos: [
          { id: "sub_E1", status: "ACTIVE", valor: 49.9, ciclo: "MONTHLY", vencimento: "2026-12-10" },
        ],
      },
      pagamento: {
        recebido: true,
        fonte: "asaas",
        coberturaAte: "2026-12-10T00:00:00.000Z",
        pendente: false,
      },
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
      assinatura: {
        id: null,
        situacao: "ausente",
        status: null,
        valor: null,
        ciclo: null,
        total: 0,
        candidatos: [],
      },
      pagamento: {
        recebido: false,
        fonte: "nenhuma",
        coberturaAte: null,
        pendente: false,
      },
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

const empresaTerminal = {
  empresaId: "E3",
  empresaNome: "Empresa Cancelada",
  preview: {
    empresaId: "E3",
    modo: "vinculada",
    versao: "v1",
    token: "tok_terminal",
    expiraEm: new Date(Date.now() + 600000).toISOString(),
    empresa: {
      nome: "Empresa Cancelada",
      status: "ATIVO",
      vencimentoPlano: "2026-12-10T00:00:00.000Z",
      ciclo: "MENSAL",
      cupomAplicado: null,
      documentoMascarado: null,
      emailMascarado: null,
    },
    asaas: {
      customer: { id: "cus_E3", situacao: "existente" },
      assinatura: {
        id: "sub_E3",
        situacao: "existente",
        status: "CANCELED",
        valor: null,
        ciclo: null,
        total: 1,
        candidatos: [],
      },
      pagamento: {
        recebido: false,
        fonte: "asaas",
        coberturaAte: null,
        pendente: true,
      },
    },
    proposta: {
      acao: "sincronizar",
      statusAtual: "ATIVO",
      statusProposto: "ATIVO",
      statusAsaasTerminal: true,
      requerConfirmacaoTerminal: true,
      requerConfirmacaoTermos: false,
      vencimentoAtual: "2026-12-10T00:00:00.000Z",
      vencimentoProposto: null,
      liberaAcesso: false,
    },
    avisos: [],
  },
};

const empresaConflito = {
  empresaId: "E4",
  empresaNome: "Empresa Conflito",
  preview: {
    empresaId: "E4",
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
      assinatura: {
        id: null,
        situacao: "ausente",
        status: null,
        valor: null,
        ciclo: null,
        total: 0,
        candidatos: [],
      },
      pagamento: {
        recebido: false,
        fonte: "nenhuma",
        coberturaAte: null,
        pendente: false,
      },
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
    json: async () => ({
      ok: true,
      modo: "vinculada",
      aplicado: true,
      statusFinal: "ATIVO",
      vencimentoPlano: "2027-01-10T00:00:00.000Z",
      ...result,
    }),
  });
}

function renderDialog(props: React.ComponentProps<typeof AsaasVinculoDialog>) {
  return render(<AsaasVinculoDialog {...props} />);
}

describe("AsaasVinculoDialog", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  it("abrir modal carrega preview e exibe status antes/depois (carregarPreview ao abrir)", async () => {
    mockPreview(empresaVinculada.preview);

    renderDialog({
      empresaId: "E1",
      empresaNome: "Empresa Vinculada",
      open: true,
      onOpenChange: jest.fn(),
    });

    await waitFor(() =>
      expect(screen.getByText("Empresa já vinculada ao Asaas")).toBeInTheDocument(),
    );
    // Preview foi carregado: exibe status antes e depois
    expect(screen.getByText("Sincronizar status/vencimento")).toBeInTheDocument();
    expect(screen.getByText("ATIVO")).toBeInTheDocument();
    // Chamou /preview com empresaId
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/master/asaas/preview"),
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"empresaId":"E1"'),
      }),
    );
  });

  it("mostra loading enquanto carrega preview", async () => {
    // fetch resolve devagar para expor o estado de carregamento
    (global.fetch as jest.Mock).mockImplementation(() =>
      new Promise((resolve) => {
        setTimeout(
          () =>
            resolve({
              ok: true,
              json: async () => ({ ok: true, preview: empresaVinculada.preview }),
            }),
          50,
        );
      }),
    );

    renderDialog({
      empresaId: "E1",
      empresaNome: "Empresa Vinculada",
      open: true,
      onOpenChange: jest.fn(),
    });

    expect(screen.getByText(/Carregando prévia/)).toBeInTheDocument();

    await waitFor(() =>
      expect(screen.getByText("Empresa já vinculada ao Asaas")).toBeInTheDocument(),
    );
  });

  it("mostra erro quando a prévia falha", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: async () => ({ ok: false, erro: "empresa_nao_encontrada" }),
    });

    renderDialog({
      empresaId: "E9",
      empresaNome: "Inexistente",
      open: true,
      onOpenChange: jest.fn(),
    });

    await waitFor(() =>
      expect(screen.getByText("Erro ao carregar prévia")).toBeInTheDocument(),
    );
  });

  it("empresa sem vínculo mostra 'Não vinculado' e oferece provisionar com resumo de cobrança", async () => {
    mockPreview(empresaProvisionamento.preview);

    renderDialog({
      empresaId: "E2",
      empresaNome: "Adega FreeStyle Drinks",
      open: true,
      onOpenChange: jest.fn(),
    });

    await waitFor(() =>
      expect(screen.getByText("Provisionar no Asaas")).toBeInTheDocument(),
    );
    expect(screen.getByText("Não vinculado")).toBeInTheDocument();
    expect(screen.getByText("Criar assinatura no Asaas")).toBeInTheDocument();
    expect(screen.getByText("Isso gera uma cobrança real no Asaas")).toBeInTheDocument();
    expect(screen.getByText("49.9")).toBeInTheDocument();
    expect(screen.getByText("MONTHLY")).toBeInTheDocument();
    expect(screen.getByText("UNDEFINED")).toBeInTheDocument();
    expect(screen.getByText("2026-12-15")).toBeInTheDocument();
    expect(screen.getByText("PAYMENT_RECEIVED")).toBeInTheDocument();
  });

  it("CTA de confirmar desabilitado até aceite explícito de termos (requerConfirmacaoTermos)", async () => {
    mockPreview(empresaProvisionamento.preview);

    renderDialog({
      empresaId: "E2",
      empresaNome: "Adega FreeStyle Drinks",
      open: true,
      onOpenChange: jest.fn(),
    });

    await waitFor(() =>
      expect(screen.getByText("Provisionar no Asaas")).toBeInTheDocument(),
    );

    const btnConfirmar = screen.getByRole("button", { name: /Confirmar ação/ });
    expect(btnConfirmar).toBeDisabled();

    // Marca o checkbox de termos
    const checkbox = screen.getByRole("checkbox", {
      name: /criação de cobrança/i,
    });
    fireEvent.click(checkbox);

    await waitFor(() => expect(btnConfirmar).not.toBeDisabled());
  });

  it("confirmacao NAO envia confirmarTermos=true sem aceite de termos", async () => {
    mockPreview(empresaProvisionamento.preview);
    mockConfirm({});

    renderDialog({
      empresaId: "E2",
      empresaNome: "Adega FreeStyle Drinks",
      open: true,
      onOpenChange: jest.fn(),
    });

    await waitFor(() =>
      expect(screen.getByText("Provisionar no Asaas")).toBeInTheDocument(),
    );

    const btnConfirmar = screen.getByRole("button", { name: /Confirmar ação/ });
    fireEvent.click(btnConfirmar);

    await waitFor(() =>
      expect(screen.getByText("Confirmado")).toBeInTheDocument(),
    );

    // Sem aceite de termos: confirmarTermos não deve ser true
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/master/asaas/confirm"),
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"empresaId":"E2"'),
      }),
    );
    const ultimoBody = (global.fetch as jest.Mock).mock.calls.at(-1)?.[1]?.body;
    expect(ultimoBody).not.toContain("confirmarTermos:true");
  });

  it("confirmacao com aceite de termos envia confirmarTermos=true", async () => {
    mockPreview(empresaProvisionamento.preview);
    mockConfirm({});

    renderDialog({
      empresaId: "E2",
      empresaNome: "Adega FreeStyle Drinks",
      open: true,
      onOpenChange: jest.fn(),
    });

    await waitFor(() =>
      expect(screen.getByText("Provisionar no Asaas")).toBeInTheDocument(),
    );

    const checkbox = screen.getByRole("checkbox", {
      name: /criação de cobrança/i,
    });
    fireEvent.click(checkbox);

    const btnConfirmar = screen.getByRole("button", { name: /Confirmar ação/ });
    fireEvent.click(btnConfirmar);

    await waitFor(() =>
      expect(screen.getByText("Confirmado")).toBeInTheDocument(),
    );

    const ultimoBody = (global.fetch as jest.Mock).mock.calls.at(-1)?.[1]?.body;
    expect(ultimoBody).toContain("confirmarTermos:true");
  });

  it("fluxo de cancelamento terminal exige aceite explicitou e só envia confirmarTerminal=true após o usuario aceitar", async () => {
    mockPreview(empresaTerminal.preview);
    mockConfirm({});

    renderDialog({
      empresaId: "E3",
      empresaNome: "Empresa Cancelada",
      open: true,
      onOpenChange: jest.fn(),
    });

    await waitFor(() =>
      expect(screen.getByText("Assinatura cancelada no Asaas")).toBeInTheDocument(),
    );

    // Antes do aceite: confirmar desabilitado
    const btnConfirmar = screen.getByRole("button", { name: /Confirmar ação/ });
    expect(btnConfirmar).toBeDisabled();

    const checkboxTerminal = screen.getByRole("checkbox", {
      name: /cancelamento terminal/i,
    });
    fireEvent.click(checkboxTerminal);

    await waitFor(() => expect(btnConfirmar).not.toBeDisabled());
    fireEvent.click(btnConfirmar);

    await waitFor(() =>
      expect(screen.getByText("Confirmado")).toBeInTheDocument(),
    );

    const ultimoBody = (global.fetch as jest.Mock).mock.calls.at(-1)?.[1]?.body;
    expect(ultimoBody).toContain("confirmarTerminal:true");
  });

  it("conflito mostra bloqueio e nao exibe CTA de confirmar", async () => {
    mockPreview(empresaConflito.preview);

    renderDialog({
      empresaId: "E4",
      empresaNome: "Empresa Conflito",
      open: true,
      onOpenChange: jest.fn(),
    });

    await waitFor(() =>
      expect(screen.getByText("Conflito no Asaas")).toBeInTheDocument(),
    );
    expect(
      screen.getByText("Conflito — não resolver automaticamente"),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Confirmar ação/ }),
    ).not.toBeInTheDocument();
  });

  it("confirmacao chama /confirm com token e exibe sucesso", async () => {
    mockPreview(empresaVinculada.preview);
    mockConfirm({});

    renderDialog({
      empresaId: "E1",
      empresaNome: "Empresa Vinculada",
      open: true,
      onOpenChange: jest.fn(),
    });

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Confirmar ação/ })).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole("button", { name: /Confirmar ação/ }));

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
