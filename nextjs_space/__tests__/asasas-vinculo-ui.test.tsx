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

jest.mock("@/components/ui/select", () => {
  const React = require("react");
  return {
    Select: ({ value, onValueChange, children }: any) => {
      const [isOpen, setIsOpen] = React.useState(false);
      return (
        <div data-testid="mock-select" data-value={value}>
          {React.Children.map(children, (child: any) =>
            React.isValidElement(child)
              ? React.cloneElement(child, {
                  isOpen,
                  setIsOpen,
                  value,
                  onValueChange,
                } as any)
              : child,
          )}
        </div>
      );
    },
    SelectTrigger: ({ children, isOpen, setIsOpen, ...props }: any) => (
      <button
        type="button"
        role="combobox"
        aria-expanded={isOpen}
        onClick={() => setIsOpen && setIsOpen(!isOpen)}
        {...props}
      >
        {children}
      </button>
    ),
    SelectValue: ({ placeholder, value }: any) => <span>{value || placeholder}</span>,
    SelectContent: ({ children, isOpen, onValueChange, setIsOpen }: any) => {
      if (!isOpen) return null;
      return (
        <div role="listbox">
          {React.Children.map(children, (child: any) =>
            React.isValidElement(child)
              ? React.cloneElement(child, { onValueChange, setIsOpen } as any)
              : child,
          )}
        </div>
      );
    },
    SelectItem: ({ children, value, onValueChange, setIsOpen, ...props }: any) => (
      <div
        role="option"
        onClick={() => {
          onValueChange && onValueChange(value);
          setIsOpen && setIsOpen(false);
        }}
        {...props}
      >
        {children}
      </div>
    ),
  };
});

import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { AsaasVinculoDialog } from "@/app/master/empresas/_components/parts/asaas-vinculo-dialog";

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

let currentPreview: any = null;

function mockPreview(preview: any) {
  currentPreview = preview;
  (global.fetch as jest.Mock).mockImplementation((_url: string) => {
    return Promise.resolve({
      ok: true,
      json: async () => ({ ok: true, preview: currentPreview }),
    });
  });
}

function mockConfirm(result: any) {
  (global.fetch as jest.Mock).mockImplementation((url: string) => {
    if (typeof url === "string" && url.includes("/confirm")) {
      return Promise.resolve({
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
    return Promise.resolve({
      ok: true,
      json: async () => ({ ok: true, preview: currentPreview }),
    });
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
    expect(screen.getAllByText("ATIVO")[0]).toBeInTheDocument();
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
    mockPreview(empresaVinculada.preview);
    mockConfirm({});

    renderDialog({
      empresaId: "E1",
      empresaNome: "Empresa Vinculada",
      open: true,
      onOpenChange: jest.fn(),
    });

    await waitFor(() =>
      expect(screen.getByText("Empresa já vinculada ao Asaas")).toBeInTheDocument(),
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
        body: expect.stringContaining('"empresaId":"E1"'),
      }),
    );
    const ultimoBody = (global.fetch as jest.Mock).mock.calls.at(-1)?.[1]?.body;
    expect(ultimoBody).not.toContain('"confirmarTermos":true');
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
    expect(ultimoBody).toContain('"confirmarTermos":true');
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
    expect(ultimoBody).toContain('"confirmarTerminal":true');
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

  it("provisionamento permite editar a data da primeira cobrança e recarrega o preview com o token atualizado", async () => {
    const previewComData = {
      ...empresaProvisionamento.preview,
      provisionamento: {
        ...empresaProvisionamento.preview.provisionamento,
        primeiroVencimento: "2026-11-30",
      },
    };
    // Primeira chamada: retorna a data proposta pelo backend.
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, preview: previewComData }),
    });

    renderDialog({
      empresaId: "E2",
      empresaNome: "Adega FreeStyle Drinks",
      open: true,
      onOpenChange: jest.fn(),
    });

    await waitFor(() =>
      expect(screen.getByText("Provisionar no Asaas")).toBeInTheDocument(),
    );
    expect(
      screen.queryByText("2026-11-30 (editado)"),
    ).not.toBeInTheDocument();
    expect(screen.getByText("2026-11-30")).toBeInTheDocument();

    // Altera a data no input: o preview é recarregado com a nova data.
    const input = screen.getByRole("textbox", {
      name: /alterar data da primeira cobrança/i,
    });
    fireEvent.change(input, { target: { value: "2026-12-05" } });

    await waitFor(() =>
      expect(screen.getByText("2026-12-05 (editado)")).toBeInTheDocument(),
    );
    // O aceito de termos foi resetado ao mudar a data.
    const btnConfirmar = screen.getByRole("button", { name: /Confirmar ação/ });
    expect(btnConfirmar).toBeDisabled();

    // A segunda chamada ao preview enviou a nova data.
    const ultimoBody = (global.fetch as jest.Mock).mock.calls.at(-1)?.[1]?.body;
    expect(ultimoBody).toContain('"primeiroVencimento":"2026-12-05"');
  });

  it("nao exibe input de data na modalidade vinculada (nao e provisionamento)", async () => {
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
    expect(screen.queryByRole("textbox", { name: /alterar data/ })).not.toBeInTheDocument();
  });

  it("trocar contato de faturamento recarrega preview com token atualizado e adminId no corpo", async () => {
    const admins = [
      { id: "A1", nome: "Admin 2", emailMascarado: "ad***s@gmail.com" },
      { id: "A2", nome: "Admin 1", emailMascarado: "jo***@empresa.com" },
    ];
    const previewComAdmin = {
      ...empresaProvisionamento.preview,
      empresa: {
        ...empresaProvisionamento.preview.empresa,
        adminEmailMascarado: "ad***s@gmail.com",
      },
      provisionamento: {
        ...empresaProvisionamento.preview.provisionamento,
        primeiroVencimento: "2026-11-30",
      },
    };
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, preview: previewComAdmin }),
    });

    renderDialog({
      empresaId: "E2",
      empresaNome: "Adega FreeStyle Drinks",
      open: true,
      onOpenChange: jest.fn(),
      admins,
    });

    await waitFor(() =>
      expect(screen.getByText("Provisionar no Asaas")).toBeInTheDocument(),
    );

    const select = screen.getByRole("combobox", { name: /contato de faturamento/i });
    fireEvent.click(select);
    await waitFor(() =>
      expect(screen.getByRole("option", { name: /Admin 2/ })).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole("option", { name: /Admin 2/ }));

    await waitFor(() =>
      expect(screen.getByText("ad***s@gmail.com")).toBeInTheDocument(),
    );

    const ultimoBody = (global.fetch as jest.Mock).mock.calls.at(-1)?.[1]?.body;
    expect(ultimoBody).toContain('"adminId":"A1"');
  });

  it("nao aceita termos automaticamente ao trocar contato de faturamento", async () => {
    const admins = [
      { id: "A1", nome: "Admin 2", emailMascarado: "ad***s@gmail.com" },
    ];
    const previewComAdmin = {
      ...empresaProvisionamento.preview,
      empresa: {
        ...empresaProvisionamento.preview.empresa,
        adminEmailMascarado: "ad***s@gmail.com",
      },
    };
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, preview: previewComAdmin }),
    });

    renderDialog({
      empresaId: "E2",
      empresaNome: "Adega FreeStyle Drinks",
      open: true,
      onOpenChange: jest.fn(),
      admins,
    });

    await waitFor(() =>
      expect(screen.getByText("Provisionar no Asaas")).toBeInTheDocument(),
    );

    const select = screen.getByRole("combobox", { name: /contato de faturamento/i });
    fireEvent.click(select);
    await waitFor(() =>
      expect(screen.getByRole("option", { name: /Admin 2/ })).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole("option", { name: /Admin 2/ }));

    await waitFor(() =>
      expect(screen.getByText("ad***s@gmail.com")).toBeInTheDocument(),
    );

    const btnConfirmar = screen.getByRole("button", { name: /Confirmar ação/ });
    expect(btnConfirmar).toBeDisabled();
  });

  it("contato de faturamento selecionado e exibido explicitamente na prévia", async () => {
    const admins = [
      { id: "A1", nome: "Admin 2", emailMascarado: "ad***s@gmail.com" },
    ];
    const previewComAdmin = {
      ...empresaProvisionamento.preview,
      empresa: {
        ...empresaProvisionamento.preview.empresa,
        adminEmailMascarado: "ad***s@gmail.com",
      },
    };
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, preview: previewComAdmin }),
    });

    renderDialog({
      empresaId: "E2",
      empresaNome: "Adega FreeStyle Drinks",
      open: true,
      onOpenChange: jest.fn(),
      admins,
    });

    await waitFor(() =>
      expect(screen.getByText("Provisionar no Asaas")).toBeInTheDocument(),
    );

    const select = screen.getByRole("combobox", { name: /contato de faturamento/i });
    fireEvent.click(select);
    await waitFor(() =>
      expect(screen.getByRole("option", { name: /Admin 2/ })).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole("option", { name: /Admin 2/ }));

    await waitFor(() =>
      expect(screen.getByText("Admin 2 — ad***s@gmail.com")).toBeInTheDocument(),
    );
  });

  it("confirmacao bloqueada enquanto nenhum contato de faturamento for selecionado (criar_assinatura)", async () => {
    const admins = [
      { id: "A1", nome: "Admin 2", emailMascarado: "ad***s@gmail.com" },
    ];
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, preview: empresaProvisionamento.preview }),
    });

    renderDialog({
      empresaId: "E2",
      empresaNome: "Adega FreeStyle Drinks",
      open: true,
      onOpenChange: jest.fn(),
      admins,
    });

    await waitFor(() =>
      expect(screen.getByText("Provisionar no Asaas")).toBeInTheDocument(),
    );

    const btnConfirmar = screen.getByRole("button", { name: /Confirmar ação/ });
    expect(btnConfirmar).toBeDisabled();
  });

  it("confirmacao com admin selecionado e termos aceitos envia adminId e confirmarTermos=true", async () => {
    const admins = [
      { id: "A1", nome: "Admin 2", emailMascarado: "ad***s@gmail.com" },
    ];
    const previewComAdmin = {
      ...empresaProvisionamento.preview,
      empresa: {
        ...empresaProvisionamento.preview.empresa,
        adminEmailMascarado: "ad***s@gmail.com",
      },
    };
    mockPreview(previewComAdmin);
    mockConfirm({});

    renderDialog({
      empresaId: "E2",
      empresaNome: "Adega FreeStyle Drinks",
      open: true,
      onOpenChange: jest.fn(),
      admins,
    });

    await waitFor(() =>
      expect(screen.getByText("Provisionar no Asaas")).toBeInTheDocument(),
    );

    const select = screen.getByRole("combobox", { name: /contato de faturamento/i });
    fireEvent.click(select);
    await waitFor(() =>
      expect(screen.getByRole("option", { name: /Admin 2/ })).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole("option", { name: /Admin 2/ }));

    await waitFor(() =>
      expect(screen.getByText("Admin 2 — ad***s@gmail.com")).toBeInTheDocument(),
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
    expect(ultimoBody).toContain('"adminId":"A1"');
    expect(ultimoBody).toContain('"confirmarTermos":true');
  });

  it("resposta realista do endpoint: Admin 2 aparece, trocar contato recarrega preview/token e limpa aceite", async () => {
    const admins = [
      { id: "A1", nome: "Admin 1", emailMascarado: "jo***@empresa.com" },
      { id: "A2", nome: "Admin 2", emailMascarado: "ad***s@gmail.com" },
    ];
    const previewSemAdmin = {
      ...empresaProvisionamento.preview,
      empresa: {
        ...empresaProvisionamento.preview.empresa,
        adminEmailMascarado: null,
      },
      provisionamento: {
        ...empresaProvisionamento.preview.provisionamento,
        primeiroVencimento: "2026-11-30",
      },
    };
    const previewComAdmin2 = {
      ...previewSemAdmin,
      empresa: {
        ...previewSemAdmin.empresa,
        adminEmailMascarado: "ad***s@gmail.com",
      },
      provisionamento: {
        ...previewSemAdmin.provisionamento,
        primeiroVencimento: "2026-11-30",
      },
      token: "tok_admin2_v2",
    };
    // Primeira chamada: preview sem admin selecionado.
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, preview: previewSemAdmin }),
    });

    renderDialog({
      empresaId: "E2",
      empresaNome: "Adega FreeStyle Drinks",
      open: true,
      onOpenChange: jest.fn(),
      admins,
    });

    await waitFor(() =>
      expect(screen.getByText("Provisionar no Asaas")).toBeInTheDocument(),
    );

    // Nenhum contato selecionado: Admin 2 não aparece na prévia, confirma bloqueada.
    expect(
      screen.queryByText("Admin 2 — ad***s@gmail.com"),
    ).not.toBeInTheDocument();
    const btnConfirmar = screen.getByRole("button", { name: /Confirmar ação/ });
    expect(btnConfirmar).toBeDisabled();

    // Seleciona Admin 2: preview recarrega com adminId e novo token.
    const select = screen.getByRole("combobox", { name: /contato de faturamento/i });
    fireEvent.click(select);
    await waitFor(() =>
      expect(screen.getByRole("option", { name: /Admin 2/ })).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole("option", { name: /Admin 2/ }));

    await waitFor(() =>
      expect(screen.getByText("Admin 2 — ad***s@gmail.com")).toBeInTheDocument(),
    );
    const ultimoBody = (global.fetch as jest.Mock).mock.calls.at(-1)?.[1]?.body;
    expect(ultimoBody).toContain('"adminId":"A2"');

    // O aceite de termos foi limpo ao trocar contato: confirma ainda bloqueada.
    const btnConfirmar2 = screen.getByRole("button", { name: /Confirmar ação/ });
    expect(btnConfirmar2).toBeDisabled();
  });

  it("preview 409 multiplos_admins: exibe lista para escolher e bloqueia confirmação", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: async () => ({
        ok: false,
        erro: "multiplos_admins_selecao_obrigatoria",
      }),
    });

    renderDialog({
      empresaId: "E2",
      empresaNome: "Adega FreeStyle Drinks",
      open: true,
      onOpenChange: jest.fn(),
      admins: [
        { id: "A1", nome: "Admin 1", emailMascarado: "jo***@empresa.com" },
        { id: "A2", nome: "Admin 2", emailMascarado: "ad***s@gmail.com" },
      ],
    });

    await waitFor(() =>
      expect(screen.getByText("Escolha o contato de faturamento")).toBeInTheDocument(),
    );
    expect(screen.getByText("Admin 2 — ad***s@gmail.com")).toBeInTheDocument();
    const btnConfirmar = screen.getByRole("button", { name: /Confirmar ação/ });
    expect(btnConfirmar).toBeDisabled();
  });

  it("preview 400 admin_invalido: limpa seleção e exibe erro", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ ok: false, erro: "admin_invalido" }),
    });

    renderDialog({
      empresaId: "E2",
      empresaNome: "Adega FreeStyle Drinks",
      open: true,
      onOpenChange: jest.fn(),
      admins: [{ id: "A1", nome: "Admin 1", emailMascarado: "jo***@empresa.com" }],
    });

    await waitFor(() =>
      expect(screen.getByText(/Contato de faturamento inválido/)).toBeInTheDocument(),
    );
    expect(screen.getByText("Nenhum contato selecionado")).toBeInTheDocument();
  });

  it("preview 409 multiplos_admins sem lista: exibe mensagem informativa e nao trava", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: async () => ({
        ok: false,
        erro: "multiplos_admins_selecao_obrigatoria",
      }),
    });

    renderDialog({
      empresaId: "E2",
      empresaNome: "Adega FreeStyle Drinks",
      open: true,
      onOpenChange: jest.fn(),
    });

    await waitFor(() =>
      expect(screen.getByText(/múltiplos admins/)).toBeInTheDocument(),
    );
    expect(
      screen.queryByText("Escolha o contato de faturamento"),
    ).not.toBeInTheDocument();
    const btnConfirmar = screen.getByRole("button", { name: /Confirmar ação/ });
    expect(btnConfirmar).toBeDisabled();
  });

  it("preview 409 multiplos_admins com lista: exibe admins, escolhe Admin 2, recarrega preview e limpa selecao", async () => {
    const admins = [
      { id: "A1", nome: "Admin 1", emailMascarado: "jo***@empresa.com" },
      { id: "A2", nome: "Admin 2", emailMascarado: "ad***s@gmail.com" },
    ];
    const previewSemAdmin = {
      ...empresaProvisionamento.preview,
      empresa: {
        ...empresaProvisionamento.preview.empresa,
        adminEmailMascarado: null,
      },
    };
    const previewComAdmin2 = {
      ...previewSemAdmin,
      token: "tok_admin2_v2",
    };

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => ({
          ok: false,
          erro: "multiplos_admins_selecao_obrigatoria",
          admins,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, preview: previewComAdmin2 }),
      });

    renderDialog({
      empresaId: "E2",
      empresaNome: "Adega FreeStyle Drinks",
      open: true,
      onOpenChange: jest.fn(),
    });

    await waitFor(() =>
      expect(screen.getByText("Admin 2 — ad***s@gmail.com")).toBeInTheDocument(),
    );
    const btnConfirmar = screen.getByRole("button", { name: /Confirmar ação/ });
    expect(btnConfirmar).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: /Admin 2/ }));

    await waitFor(() =>
      expect(screen.getByText("Admin 2 — ad***s@gmail.com")).toBeInTheDocument(),
    );
    const ultimoBody = (global.fetch as jest.Mock).mock.calls.at(-1)?.[1]?.body;
    expect(ultimoBody).toContain('"adminId":"A2"');
  });

  it("erro de rede nao tipado exibe mensagem real e nao mascara conflito", async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error("falha de rede"));

    renderDialog({
      empresaId: "E9",
      empresaNome: "Inexistente",
      open: true,
      onOpenChange: jest.fn(),
    });

    await waitFor(() =>
      expect(screen.getByText("Erro ao carregar prévia")).toBeInTheDocument(),
    );
    await waitFor(() =>
      expect(screen.getByText("falha de rede")).toBeInTheDocument(),
    );
  });

  it("fechar o modal reseta adminsErro e adminsExigidos", async () => {
    const admins = [
      { id: "A1", nome: "Admin 1", emailMascarado: "jo***@empresa.com" },
      { id: "A2", nome: "Admin 2", emailMascarado: "ad***s@gmail.com" },
    ];
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: async () => ({
        ok: false,
        erro: "multiplos_admins_selecao_obrigatoria",
        admins,
      }),
    });

    const onOpenChange = jest.fn();
    renderDialog({
      empresaId: "E2",
      empresaNome: "Adega FreeStyle Drinks",
      open: true,
      onOpenChange,
    });

    await waitFor(() =>
      expect(screen.getByText("Escolha o contato de faturamento")).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole("button", { name: /Fechar/ }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("confirm envia adminId e primeiroVencimento no corpo", async () => {
    mockPreview(empresaProvisionamento.preview);
    mockConfirm({});

    renderDialog({
      empresaId: "E2",
      empresaNome: "Adega FreeStyle Drinks",
      open: true,
      onOpenChange: jest.fn(),
      admins: [{ id: "A1", nome: "Admin 2", emailMascarado: "ad***s@gmail.com" }],
    });

    await waitFor(() =>
      expect(screen.getByText("Provisionar no Asaas")).toBeInTheDocument(),
    );

    const select = screen.getByRole("combobox", { name: /contato de faturamento/i });
    fireEvent.click(select);
    await waitFor(() =>
      expect(screen.getByRole("option", { name: /Admin 2/ })).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole("option", { name: /Admin 2/ }));

    await waitFor(() =>
      expect(screen.getByText("Admin 2 — ad***s@gmail.com")).toBeInTheDocument(),
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
    expect(ultimoBody).toContain('"adminId":"A1"');
    expect(ultimoBody).toContain('"confirmarTermos":true');
    expect(ultimoBody).toContain('"primeiroVencimento"');
  });
});
