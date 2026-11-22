import { render, screen, waitFor, act } from "@testing-library/react";
import MinhaContaPage from "@/app/(funcionario)/minha-conta/page";

const useSessionMock = jest.fn();
const replaceMock = jest.fn();

jest.mock("next-auth/react", () => ({
  useSession: () => useSessionMock(),
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock }),
}) as any);

jest.mock("next/link", () => ({
  default: ({ children }: { children?: React.ReactNode }) => children,
  Link: ({ children }: { children?: React.ReactNode }) => children,
}));

const getUrl = (input: string | Request | URL | undefined): string => {
  if (!input) return "";
  if (typeof input === "string") return input;
  if (input instanceof Request) return input.url;
  return String(input);
};

const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
(global as any).fetch = mockFetch;

const renderPage = (role: string | null) => {
  useSessionMock.mockReturnValue({
    data: role ? { user: { role, name: "João" } } : null,
    status: role ? "authenticated" : "unauthenticated",
  } as any);
  return render(<MinhaContaPage />);
};

beforeEach(() => {
  mockFetch.mockClear();
  useSessionMock.mockClear();
  replaceMock.mockClear();
});

describe("Minha Conta - acesso para caixa", () => {
  it("não exibe conteúdo enquanto session não carregada", () => {
    useSessionMock.mockReturnValue({ data: null, status: "unauthenticated" } as any);
    render(<MinhaContaPage />);
    expect(screen.queryByText("Minhas Vendas")).not.toBeInTheDocument();
  });

  it("transição loading → autenticada exibe Minhas Vendas para caixa", async () => {
    let current = { data: null, status: "unauthenticated" } as any;
    const Wrapper = ({ children }: { children: React.ReactNode }) => {
      useSessionMock.mockReturnValue(current);
      return <>{children}</>;
    };
    const { rerender } = render(<Wrapper><MinhaContaPage /></Wrapper>);
    expect(screen.queryByText("Minhas Vendas")).not.toBeInTheDocument();

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ lastSales: [], salesMonth: 0, metaMensal: 0 }),
    } as Response);
    current = { data: { user: { role: "caixa", name: "João" } }, status: "authenticated" } as any;
    act(() => rerender(<Wrapper><MinhaContaPage /></Wrapper>));
    await waitFor(() => screen.getByText("Minhas Vendas"));
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("caixa não é redirecionado para /dashboard", async () => {
    mockFetch.mockImplementation((url: string) =>
      Promise.resolve({
        ok: true,
        json: async () =>
          getUrl(url).includes("/api/avisos")
            ? []
            : { lastSales: [], salesMonth: 0, metaMensal: 0 },
      } as Response),
    );
    renderPage("caixa");
    await waitFor(() => screen.getByText("Minhas Vendas"));
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("caixa carrega vendas e meta mensal do analytics", async () => {
    mockFetch.mockImplementation((url: string) =>
      Promise.resolve({
        ok: true,
        json: async () =>
          getUrl(url).includes("/api/avisos")
            ? []
            : {
                lastSales: [
                  {
                    id: "abc123",
                    valorTotal: 99,
                    createdAt: new Date().toISOString(),
                  },
                ],
                salesMonth: 500,
                metaMensal: 1000,
              },
      } as Response),
    );
    renderPage("caixa");
    await waitFor(() => screen.getByText("Minhas Vendas"));
    await waitFor(() => screen.getByText("R$ 500,00"));
    expect(screen.getByText("Meta Mensal")).toBeInTheDocument();
  });

  it("gerente continua vendo Minhas Conta", async () => {
    mockFetch.mockImplementation((url: string) =>
      Promise.resolve({
        ok: true,
        json: async () =>
          getUrl(url).includes("/api/avisos")
            ? []
            : { lastSales: [], salesMonth: 0, metaMensal: 0 },
      } as Response),
    );
    renderPage("gerente");
    await waitFor(() => screen.getByText("Minhas Vendas"));
    expect(screen.getByText("Minhas Vendas")).toBeInTheDocument();
  });
});
