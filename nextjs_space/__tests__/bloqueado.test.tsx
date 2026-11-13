/**
 * @jest-environment jsdom
 *
 * Testa a UI da pagina /bloqueado:
 *  - Admin com fatura pendente: mostra "Pagar Agora" com invoiceUrl do Asaas
 *    (fluxo real de cobrança via /api/billing/pending, sem hardcode de URL).
 *  - Funcionario (não-admin): mostra "Acesso Suspenso", motivo de falta de
 *    pagamento, indica ao administrador e link "Voltar para o login".
 *  - Nao mostra "Sistema Temporariamente Indisponível" (manutencao) para nenhum papel.
 */

jest.mock("next/navigation", () => {
  const useSearchParams = jest.fn(() =>
    new URLSearchParams("reason=vencido&email=admin@test.com&role=admin"),
  );
  const useRouter = jest.fn(() => ({ push: jest.fn() }));
  const Link = ({ children, href }: any) => (
    <a data-link-href={href}>{children}</a>
  );
  Link.__esModule = true;
  Link.default = Link;
  return { useSearchParams, useRouter, Link };
});

global.IntersectionObserver = jest.fn(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
})) as any;

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import BloqueadoPage from "../app/bloqueado/page";
import { useSearchParams } from "next/navigation";
import "@testing-library/jest-dom";

beforeEach(() => {
  jest.clearAllMocks();
  (useSearchParams as jest.Mock).mockImplementation(() =>
    new URLSearchParams("reason=vencido&email=admin@test.com&role=admin"),
  );
  global.fetch = jest.fn();
});

function setParams(reason: string, role: string) {
  (useSearchParams as jest.Mock).mockImplementation(() =>
    new URLSearchParams(`reason=${reason}&email=test@test.com&role=${role}`),
  );
}

describe("Pagina /bloqueado", () => {
  it("admin com fatura pendente mostra CTA Pagar Agora e link de login", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        billing: {
          value: 49.9,
          invoiceUrl: "https://app.asaas.com/pay/abc123",
          status: "PENDING",
          vencimento: "15/11/2026",
        },
      }),
    });
    setParams("vencido", "admin");

    render(<BloqueadoPage />);

    await waitFor(() =>
      expect(screen.getByText("Pagar Agora")).toBeInTheDocument(),
    );
    expect(screen.getByText(/R\$\s*49,90/)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Pagar Agora/ }),
    ).toHaveAttribute("href", "https://app.asaas.com/pay/abc123");
    expect(screen.getByText("← Voltar para o login")).toBeInTheDocument();
    expect(
      screen.queryByText(/Sistema Temporariamente Indisponível/),
    ).not.toBeInTheDocument();
    expect(screen.getByText("PIX • Boleto • Cartão de Crédito")).toBeInTheDocument();
  });

  it("funcionario mostra Acesso Suspenso, motivo de pagamento e link de login, sem CTA de pagar", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ billing: null }),
    });
    setParams("pausado", "employee");

    render(<BloqueadoPage />);

    await waitFor(() =>
      expect(screen.getByText("Acesso Suspenso")).toBeInTheDocument(),
    );
    expect(
      screen.getByText(/pagamento não foi identificado/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/administrador da sua empresa/i),
    ).toBeInTheDocument();
    expect(screen.getByText("← Voltar para o login")).toBeInTheDocument();
    expect(screen.queryByText(/Pagar Agora/)).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Sistema Temporariamente Indisponível/),
    ).not.toBeInTheDocument();
  });

  it("motivo cancelado nao mostra CTA de pagar nem desbloqueio", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ billing: null }),
    });
    setParams("cancelado", "admin");

    render(<BloqueadoPage />);

    await waitFor(() =>
      expect(screen.getByText("Conta Cancelada")).toBeInTheDocument(),
    );
    expect(screen.queryByText(/Pagar Agora/)).not.toBeInTheDocument();
    expect(screen.getByText("← Voltar para o login")).toBeInTheDocument();
  });
});
