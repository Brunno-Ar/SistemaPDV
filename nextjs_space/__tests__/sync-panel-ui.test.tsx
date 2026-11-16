/**
 * @jest-environment jsdom
 *
 * Teste de UI do painel sync-all: alinhado ao JSON exato do backend
 * (commit 88e3695): sucesso com `success: true`, `semCadastro`, `details[]`
 * com status `sem_cadastro`; falha retorna `{ error }` sem `success`.
 * Mocka fetch e sonner. Nenhuma chamada ao Asaas/DB real.
 */
jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { SyncPanel } from "../app/master/_components/sync-panel";
import { toast } from "sonner";

interface MockResponse {
  ok: boolean;
  status: number;
  json: () => Promise<any>;
}

function createResponse(data: any, status = 200): MockResponse {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
  };
}

function mockFetch(res: MockResponse) {
  (global.fetch as jest.Mock).mockResolvedValue(res);
}

describe("SyncPanel", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
    (toast.success as jest.Mock).mockClear();
    (toast.error as jest.Mock).mockClear();
  });

  it("exibe resultado de sucesso e lista empresas sem cadastro (sem criar assinatura)", async () => {
    mockFetch(
      createResponse({
        success: true,
        total: 5,
        vinculadas: 3,
        semCadastro: 2,
        updated: 3,
        pendentes: 0,
        errors: 0,
        details: [
          { empresa: "Empresa A", status: "sem_cadastro" },
          { empresa: "Empresa B", status: "sem_cadastro" },
          { empresa: "Empresa C", status: "success", oldStatus: "PENDENTE", newStatus: "ATIVO" },
        ],
      }),
    );

    render(<SyncPanel />);

    fireEvent.click(screen.getByRole("button", { name: /Sincronizar Todas as Empresas/ }));

    await waitFor(() =>
      expect(screen.getByText("Resultado da Sincronização")).toBeInTheDocument(),
    );

    expect(screen.getByText("Sem cadastro")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("Empresa A")).toBeInTheDocument();
    expect(screen.getByText("Empresa B")).toBeInTheDocument();
    // toast de sucesso
    expect(toast.success).toHaveBeenCalled();
  });

  it("tratamento de falha sem `success` (shape {error}) nao finge sucesso", async () => {
    mockFetch(createResponse({ error: "Unauthorized" }, 401));

    render(<SyncPanel />);

    fireEvent.click(screen.getByRole("button", { name: /Sincronizar Todas as Empresas/ }));

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    // Nenhum resultado de sucesso renderizado
    expect(screen.queryByText("Resultado da Sincronização")).not.toBeInTheDocument();
  });

  it("tratamento de status nao-200 nao finge sucesso", async () => {
    mockFetch(createResponse({ error: "Internal Server Error" }, 500));

    render(<SyncPanel />);

    fireEvent.click(screen.getByRole("button", { name: /Sincronizar Todas as Empresas/ }));

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(screen.queryByText("Resultado da Sincronização")).not.toBeInTheDocument();
  });

  it("botao desabilitado durante o carregamento", async () => {
    let resolveFetch: (v: MockResponse) => void = () => {};
    const fetchPromise = new Promise<MockResponse>((res) => {
      resolveFetch = res;
    });
    (global.fetch as jest.Mock).mockReturnValue(fetchPromise);

    render(<SyncPanel />);

    fireEvent.click(screen.getByRole("button", { name: /Sincronizar Todas as Empresas/ }));
    expect(
      screen.getByRole("button", { name: /Sincronizando/ }),
    ).toBeDisabled();

    resolveFetch(
      createResponse({
        success: true,
        total: 0,
        vinculadas: 0,
        semCadastro: 0,
        updated: 0,
        pendentes: 0,
        errors: 0,
        details: [],
      }),
    );

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Sincronizar Todas as Empresas/ })).not.toBeDisabled(),
    );
  });
});
