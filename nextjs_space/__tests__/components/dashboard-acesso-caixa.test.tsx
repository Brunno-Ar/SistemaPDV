import React from "react";
import { render, screen, waitFor, act } from "@testing-library/react";
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

const getUrl = (input: unknown): string => {
  if (input == null) return "";
  if (typeof input === "string") return input;
  if (typeof input === "object") {
    const obj = input as Record<string, unknown>;
    if (typeof obj.url === "string") return obj.url;
    if (typeof obj.href === "string") return obj.href;
  }
  return String(input);
};

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

describe("Dashboard - métricas individuais para caixa", () => {
  it("esconde resumos do caixa até a sessão carregar (fail-closed)", () => {
    useSessionMock.mockReturnValue({ data: null, status: "unauthenticated" } as any);
    mockFetch.mockImplementation((input: unknown) => {
      const u = getUrl(input);
      return Promise.resolve({
        ok: true,
        json: async () => {
          if (u.includes("/api/avisos")) return [];
          if (u.includes("/api/employee/analytics")) {
            return { salesToday: 100, salesMonth: 1000, totalItemsSold: 10, weeklySales: [] };
          }
          return { caixaAberto: null };
        },
      } as Response);
    });
    render(<DashboardClient />);
    // Sem sessão: resumos do caixa não aparecem (fail-closed)
    expect(screen.queryByText(/Dinheiro em Caixa/)).not.toBeInTheDocument();
    expect(screen.queryByText("Vendas Totais")).not.toBeInTheDocument();
    expect(screen.queryByText("Suprimentos")).not.toBeInTheDocument();
    expect(screen.queryByText("Sangrias")).not.toBeInTheDocument();
  });

  it("gerente com sessão exibe resumos", async () => {
    useSessionMock.mockReturnValue({ data: { user: { role: "gerente", name: "João" } }, status: "authenticated" } as any);
    mockFetch.mockImplementation((input: unknown) => {
      const u = getUrl(input);
      return Promise.resolve({
        ok: true,
        json: async () => {
          if (u.includes("/api/avisos")) return [];
          if (u.includes("/api/employee/analytics")) {
            return { salesToday: 100, salesMonth: 1000, totalItemsSold: 10, weeklySales: [] };
          }
          return { caixaAberto: null };
        },
      } as Response);
    });
    render(<DashboardClient />);
    await waitFor(() => screen.getByText("Vendas Hoje"));
    expect(screen.getByText("Vendas Hoje")).toBeInTheDocument();
  });
  it("caixa busca /api/employee/analytics e renderiza KPIs", async () => {
    mockFetch.mockImplementation((input: unknown) => {
      const u = getUrl(input);
      return Promise.resolve({
        ok: true,
        json: async () => {
          if (u.includes("/api/employee/analytics")) {
            return {
              salesToday: 150,
              salesMonth: 1200,
              totalItemsSold: 5,
              weeklySales: [{ name: "Seg", total: 100 }],
            };
          }
          if (u.includes("/api/avisos")) return [];
          return { caixaAberto: null };
        },
      } as Response);
    });
    renderPage("caixa");
    await waitFor(() => screen.getByText("Minhas vendas hoje"));
    await waitFor(() => screen.getByText("Desempenho Semanal"));
    const urls = mockFetch.mock.calls.map((c) => getUrl(c[0]));
    expect(urls).toContain("/api/employee/analytics");
    expect(urls).toContain("/api/caixa");
  });

  it("caixa não faz polling de analytics (somente gerente)", async () => {
    mockFetch.mockImplementation((input: unknown) => {
      const u = getUrl(input);
      return Promise.resolve({
        ok: true,
        json: async () => {
          if (u.includes("/api/employee/analytics")) {
            return {
              salesToday: 100,
              salesMonth: 1000,
              totalItemsSold: 10,
              weeklySales: [],
            };
          }
          if (u.includes("/api/avisos")) return [];
          return { caixaAberto: null };
        },
      } as Response);
    });
    renderPage("caixa");
    await waitFor(() => screen.getByText("Minhas vendas hoje"));
    const urls = mockFetch.mock.calls.map((c) => getUrl(c[0]));
    const analyticsCalls = urls.filter((u) => u === "/api/employee/analytics");
    expect(analyticsCalls.length).toBe(1);
  });

  it("gerente continua vendo métricas e faz fetch de analytics", async () => {
    mockFetch.mockImplementation((input: unknown) => {
      const u = getUrl(input);
      return Promise.resolve({
        ok: true,
        json: async () => {
          if (u.includes("/api/avisos")) return [];
          if (u.includes("/api/employee/analytics")) {
            return {
              salesToday: 100,
              salesMonth: 1000,
              totalItemsSold: 10,
              weeklySales: [],
            };
          }
          return { caixaAberto: null };
        },
      } as Response);
    });
    renderPage("gerente");
    await waitFor(() => screen.getByText("Vendas Hoje"));
    const urls = mockFetch.mock.calls.map((c) => getUrl(c[0]));
    expect(urls).toContain("/api/employee/analytics");
  });

  const caixaAbertoFixture = {
    id: "caixa-1",
    status: "ABERTO" as const,
    saldoInicial: 100,
    dataAbertura: new Date().toISOString(),
    movimentacoes: [],
    resumo: {
      vendasDinheiro: 500,
      vendasPix: 300,
      vendasCartao: 200,
      vendasCredito: 100,
      vendasDebito: 100,
      totalSangrias: 50,
      totalSuprimentos: 30,
      saldoTeoricoDinheiro: 800,
      saldoTeoricoMaquininha: 300,
      totalTeoricoSistema: 1100,
    },
  } as any;

  it("caixa com caixa aberto: sem resumos gerais, com controles operacionais", async () => {
    mockFetch.mockImplementation((input: unknown) => {
      const u = getUrl(input);
      return Promise.resolve({
        ok: true,
        json: async () => {
          if (u.includes("/api/avisos")) return [];
          if (u.includes("/api/caixa")) return { caixaAberto: caixaAbertoFixture };
          if (u.includes("/api/employee/analytics")) {
            return {
              salesToday: 100,
              salesMonth: 1000,
              totalItemsSold: 10,
              weeklySales: [],
            };
          }
          return {};
        },
      } as Response);
    });
    renderPage("caixa");
    await waitFor(() => screen.getByText("Caixa Aberto"));
    expect(screen.queryAllByText(/Dinheiro em Caixa/).length).toBe(0);
    expect(screen.queryAllByText(/Vendas Totais/).length).toBe(0);
    expect(screen.queryAllByText(/Suprimentos/).length).toBe(0);
    expect(screen.queryAllByText(/Sangrias/).length).toBe(0);
    expect(screen.getByText("Fechar Caixa")).toBeInTheDocument();
    expect(screen.getByText("Suprimento")).toBeInTheDocument();
    expect(screen.getByText("Sangria")).toBeInTheDocument();
  });

  it("gerente com caixa aberto: resumos visíveis", async () => {
    mockFetch.mockImplementation((input: unknown) => {
      const u = getUrl(input);
      return Promise.resolve({
        ok: true,
        json: async () => {
          if (u.includes("/api/avisos")) return [];
          if (u.includes("/api/caixa")) return { caixaAberto: caixaAbertoFixture };
          if (u.includes("/api/employee/analytics")) {
            return {
              salesToday: 100,
              salesMonth: 1000,
              totalItemsSold: 10,
              weeklySales: [],
            };
          }
          return {};
        },
      } as Response);
    });
    renderPage("gerente");
    await waitFor(() => screen.getByText("Caixa Aberto"));
    expect(screen.getAllByText(/Dinheiro em Caixa/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Vendas Totais/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Suprimentos/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Sangrias/).length).toBeGreaterThan(0);
  });
});
