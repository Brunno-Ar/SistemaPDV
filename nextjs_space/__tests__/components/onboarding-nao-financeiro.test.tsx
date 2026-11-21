import { render, screen, waitFor } from "@testing-library/react";
import { EmployeeOnboardingChecklist } from "@/components/features/onboarding-tour/employee-onboarding-checklist";

const useSessionMock = jest.fn();

jest.mock("next-auth/react", () => ({
  useSession: () => useSessionMock(),
}));

const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
(global as any).fetch = mockFetch;

const renderPage = () => {
  useSessionMock.mockReturnValue({
    data: { user: { role: "caixa", name: "João" } },
    status: "authenticated",
  } as any);
  return render(<EmployeeOnboardingChecklist />);
};

beforeEach(() => {
  mockFetch.mockClear();
  useSessionMock.mockClear();
});

describe("Onboarding - contrato não financeiro", () => {
  it("consome só o booleano hasSale de /api/employee/onboarding-status", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ hasSale: true }),
    } as Response);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ caixaAberto: null }),
    } as Response);
    renderPage();
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2));
    const urls = mockFetch.mock.calls.map((c) => String(c[0]));
    expect(urls).toContain("/api/employee/onboarding-status");
    expect(urls).not.toContain("/api/employee/analytics");
    expect(screen.queryByText("Pronto para começar a vender?")).not.toBeInTheDocument();
  });

  it("mostra checklist quando hasSale é false", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ hasSale: false }),
    } as Response);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ caixaAberto: null }),
    } as Response);
    renderPage();
    await waitFor(() => screen.getByText("Pronto para começar a vender?"));
  });
});
