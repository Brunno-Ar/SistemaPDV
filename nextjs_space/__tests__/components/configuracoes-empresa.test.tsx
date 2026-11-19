import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ConfiguracoesPage from "@/app/(funcionario)/configuracoes/page";
import { useSession } from "next-auth/react";
import "@testing-library/jest-dom";

jest.mock("next-auth/react", () => ({
  useSession: jest.fn(),
}));

// Polyfills para JSDOM (next-themes usa matchMedia; Skeleton usa cn/utils)
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

jest.mock("@/components/ui/skeleton", () => ({
  Skeleton: ({ className }: { className?: string }) => (
    <div data-testid="skeleton" className={className} />
  ),
}));

const empresaPayload = {
  empresa: {
    id: "emp_1",
    nome: "Bom Preço Ltda",
    cpfCnpj: "11.111.111/0001-11",
    telefone: "(11) 90000-0000",
    enderecoCep: "01234-567",
    enderecoLogradouro: "Av. Paulista",
    enderecoNumero: "1000",
    enderecoBairro: "Bela Vista",
    enderecoCidade: "São Paulo",
    enderecoUf: "SP",
  },
};

const mockResponse = (status: number, body: any) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
});

const renderPage = (role: string, empresaOk = true, empresaId = "emp_1") => {
  const fetchMock = jest.fn().mockResolvedValue(
    mockResponse(
      empresaOk ? 200 : 404,
      empresaOk ? empresaPayload : { error: "não encontrado" },
    ),
  );
  (global.fetch as jest.Mock) = fetchMock;
  jest.mocked(useSession).mockReturnValue({
    data: {
      user: {
        id: "user_1",
        name: "João",
        email: "joao@test.com",
        role,
        empresaId,
      },
    },
  } as any);
  render(<ConfiguracoesPage />);
  return fetchMock;
};

describe("ConfiguracoesPage - Dados da Empresa (admin)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const fetchMock = jest.fn().mockResolvedValue(mockResponse(200, empresaPayload));
    (global.fetch as jest.Mock) = fetchMock;
  });

  it("admin vê a seção Dados da Empresa com os campos preenchidos", async () => {
    renderPage("admin", true);
    await waitFor(() => screen.getByLabelText(/CPF \/ CNPJ/));
    expect(screen.getByLabelText(/CPF \/ CNPJ/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Telefone \/ Contato/)).toBeInTheDocument();
    expect(screen.getByLabelText(/CEP/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Logradouro/)).toBeInTheDocument();
  });

  it("caixa NÃO vê a seção Dados da Empresa", async () => {
    renderPage("caixa", true);
    await waitFor(() => screen.getByText("Configurações"));
    expect(screen.queryByText("Dados da Empresa")).not.toBeInTheDocument();
  });

  it("salva dados da empresa via PATCH /api/admin/empresa", async () => {
    const fetchMock = renderPage("admin", true);
    await waitFor(() => screen.getByLabelText(/CPF \/ CNPJ/));

    fireEvent.change(screen.getByLabelText(/CEP/), {
      target: { value: "01234-000" },
    });
    fireEvent.click(screen.getByText(/Atualizar Dados/));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/admin/empresa",
        expect.objectContaining({ method: "PATCH" }),
      ),
    );
    const calls = (fetchMock as jest.Mock).mock.calls.filter(
      (c: any) => c[0] === "/api/admin/empresa",
    );
    const patchCall = calls.find((c: any) => c[1]?.method === "PATCH");
    expect(patchCall).toBeDefined();
    const body = JSON.parse(patchCall?.[1]?.body || "{}");
    expect(body.enderecoCep).toBe("01234000");
  });

  it("admin sem empresaId NÃO vê a seção Dados da Empresa", async () => {
    jest.clearAllMocks();
    jest.mocked(useSession).mockReturnValue({
      data: {
        user: {
          id: "user_1",
          name: "João",
          email: "joao@test.com",
          role: "admin",
          empresaId: undefined,
        },
      },
    } as any);
    render(<ConfiguracoesPage />);
    await waitFor(() => screen.getByText("Configurações"));
    expect(screen.queryByText("Dados da Empresa")).not.toBeInTheDocument();
  });

  it("rejeita telefone com menos de 10 dígitos", async () => {
    renderPage("admin", true);
    await waitFor(() => screen.getByLabelText(/CPF \/ CNPJ/));
    fireEvent.change(screen.getByLabelText(/Telefone \/ Contato/), {
      target: { value: "11999" },
    });
    fireEvent.click(screen.getByText(/Atualizar Dados/));
    await waitFor(() =>
      expect(screen.getByText(/Telefone deve ter 10 ou 11 dígitos/)).toBeInTheDocument(),
    );
  });

  it("rejeita telefone com 9 dígitos", async () => {
    renderPage("admin", true);
    await waitFor(() => screen.getByLabelText(/CPF \/ CNPJ/));
    fireEvent.change(screen.getByLabelText(/Telefone \/ Contato/), {
      target: { value: "119999999" },
    });
    fireEvent.click(screen.getByText(/Atualizar Dados/));
    await waitFor(() =>
      expect(screen.getByText(/Telefone deve ter 10 ou 11 dígitos/)).toBeInTheDocument(),
    );
  });

  it("rejeita telefone com 12 dígitos sem DDI 55", async () => {
    renderPage("admin", true);
    await waitFor(() => screen.getByLabelText(/CPF \/ CNPJ/));
    fireEvent.change(screen.getByLabelText(/Telefone \/ Contato/), {
      target: { value: "119999999999" },
    });
    fireEvent.click(screen.getByText(/Atualizar Dados/));
    await waitFor(() =>
      expect(screen.getByText(/Telefone deve ter 10 ou 11 dígitos/)).toBeInTheDocument(),
    );
  });

  it("aceita telefone com 10 dígitos", async () => {
    renderPage("admin", true);
    await waitFor(() => screen.getByLabelText(/CPF \/ CNPJ/));
    fireEvent.change(screen.getByLabelText(/Telefone \/ Contato/), {
      target: { value: "1199999999" },
    });
    fireEvent.click(screen.getByText(/Atualizar Dados/));
    await waitFor(() =>
      expect(screen.queryByText(/Telefone deve ter 10 ou 11 dígitos/)).not.toBeInTheDocument(),
    );
  });

  it("aceita telefone com 11 dígitos", async () => {
    renderPage("admin", true);
    await waitFor(() => screen.getByLabelText(/CPF \/ CNPJ/));
    fireEvent.change(screen.getByLabelText(/Telefone \/ Contato/), {
      target: { value: "11999999999" },
    });
    fireEvent.click(screen.getByText(/Atualizar Dados/));
    await waitFor(() =>
      expect(screen.queryByText(/Telefone deve ter 10 ou 11 dígitos/)).not.toBeInTheDocument(),
    );
  });

  it("aceita telefone com DDI 55 (13 dígitos)", async () => {
    renderPage("admin", true);
    await waitFor(() => screen.getByLabelText(/CPF \/ CNPJ/));
    fireEvent.change(screen.getByLabelText(/Telefone \/ Contato/), {
      target: { value: "+55 11 90000-0000" },
    });
    fireEvent.click(screen.getByText(/Atualizar Dados/));
    await waitFor(() =>
      expect(screen.queryByText(/Telefone deve ter 10 ou 11 dígitos/)).not.toBeInTheDocument(),
    );
  });
});
