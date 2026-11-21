import { ReactNode } from "react";
import { render, screen, waitFor } from "@testing-library/react";
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

describe("Minha Conta - bloqueio para caixa", () => {
  it("redireciona caixa para /dashboard", async () => {
    renderPage("caixa");
    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/dashboard"));
  });

  it("renderiza conteúdo para gerente", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ lastSales: [], salesMonth: 0, metaMensal: 0 }),
    } as Response);
    renderPage("gerente");
    await waitFor(() => screen.getByText("Minhas Vendas"));
    expect(screen.getByText("Minhas Vendas")).toBeInTheDocument();
  });
});
