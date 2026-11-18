import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ConfiguracoesPage } from "@/app/(funcionario)/configuracoes/page";
import { useSession } from "next-auth/react";
import "@testing-library/jest-dom";

jest.mock("next-auth/react", () => ({
  useSession: jest.fn(),
}));

const empresaPayload = {
  empresa: {
    id: "emp_1",
    nome: "Bom Preço Ltda",
    cpfCnpj: "11.111.111/0001-11",
    telefone: "(11) 90000-0000",
    endereco: {
      cep: "01234-567",
      logradouro: "Av. Paulista",
      numero: "1000",
      bairro: "Bela Vista",
      cidade: "São Paulo",
      uf: "SP",
    },
  },
};

const renderPage = (role: "admin" | "caixa", empresaOk = true) => {
  (global.fetch as jest.Mock) = jest.fn().mockResolvedValue(
    empresaOk
      ? new Response(JSON.stringify(empresaPayload), { status: 200 })
      : new Response(JSON.stringify({ error: "não encontrado" }), {
          status: 404,
        }),
  );
  jest.mocked(useSession).mockReturnValue({
    data: {
      user: {
        id: "user_1",
        name: "João",
        email: "joao@test.com",
        role,
        empresaId: "emp_1",
      },
    },
  } as any);
  return render(<ConfiguracoesPage />);
};

describe("ConfiguracoesPage - Dados da Empresa (admin)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("admin vê a seção Dados da Empresa com os campos preenchidos", async () => {
    renderPage("admin", true);
    await waitFor(() => screen.getByText("Dados da Empresa"));
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
    const fetchMock = jest.mocked(global.fetch);
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(empresaPayload), { status: 200 }),
    );
    renderPage("admin", true);
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
    const body = JSON.parse(
      (fetchMock as jest.Mock).mock.calls.find(
        (c: any) => c[0] === "/api/admin/empresa",
      )?.[1]?.body,
    );
    expect(body.enderecoCep).toBe("01234000");
  });
});
