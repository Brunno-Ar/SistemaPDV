import { render, screen, waitFor } from "@testing-library/react";
import DashboardClient from "@/app/(funcionario)/dashboard/_components/dashboard-client";

const useSessionMock = jest.fn();

jest.mock("next-auth/react", () => ({
  useSession: () => useSessionMock(),
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
}));

jest.mock("next/link", () => {
  const React = jest.requireActual("react");
  return {
    __esModule: true,
    default: ({ children, href }: { children?: React.ReactNode; href?: string }) =>
      React.createElement("a", { href: href || "#" }, children),
    Link: ({ children, href }: { children?: React.ReactNode; href?: string }) =>
      React.createElement("a", { href: href || "#" }, children),
  };
});

const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
(global as any).fetch = mockFetch;

const renderPage = (role: string) => {
  useSessionMock.mockReturnValue({
    data: { user: { role, name: "João" } },
    status: "authenticated",
  } as any);
  return render(<DashboardClient />);
};

beforeEach(() => {
  mockFetch.mockClear();
  useSessionMock.mockClear();
});

describe("Dashboard - recorte de métricas para caixa", () => {
  it("caixa não faz fetch de /api/employee/analytics", async () => {
    mockFetch.mockImplementation((url: string) =>
      Promise.resolve({
        ok: true,
        json: async () =>
          String(url).includes("/api/avisos")
            ? []
            : { caixaAberto: null },
      } as Response),
    );
    renderPage("caixa");
    await waitFor(() => expect(mockFetch).toHaveBeenCalled());
    const urls = mockFetch.mock.calls.map((c) => String(c[0]));
    expect(urls).not.toContain("/api/employee/analytics");
    expect(urls).toContain("/api/caixa");
  });

  it("caixa não renderiza KPIs nem gráfico", async () => {
    mockFetch.mockImplementation((url: string) =>
      Promise.resolve({
        ok: true,
        json: async () =>
          String(url).includes("/api/avisos")
            ? []
            : { caixaAberto: null },
      } as Response),
    );
    renderPage("caixa");
    await waitFor(() => expect(screen.getAllByText("Nova Venda (PDV)").length).toBeGreaterThan(0));
    expect(screen.queryByText("Vendas Hoje")).not.toBeInTheDocument();
    expect(screen.queryByText("Desempenho Semanal")).not.toBeInTheDocument();
  });

  it("gerente continua vendo métricas e faz fetch de analytics", async () => {
    mockFetch.mockImplementation((url: string) =>
      Promise.resolve({
        ok: true,
        json: async () =>
          String(url).includes("/api/avisos")
            ? []
            : String(url).includes("/api/employee/analytics")
            ? {
                salesToday: 100,
                salesMonth: 1000,
                totalItemsSold: 10,
                weeklySales: [],
              }
            : { caixaAberto: null },
      } as Response),
    );
    renderPage("gerente");
    await waitFor(() => screen.getByText("Vendas Hoje"));
    const urls = mockFetch.mock.calls.map((c) => String(c[0]));
    expect(urls).toContain("/api/employee/analytics");
  });
});
