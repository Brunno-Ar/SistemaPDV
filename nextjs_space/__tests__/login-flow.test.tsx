/**
 * @jest-environment jsdom
 *
 * Testa o fluxo de login e o redirecionamento para /bloqueado:
 *  - Credenciais inválidas: mostra erro "Email ou senha inválidos"
 *  - Erro de acesso bloqueado: redireciona para /bloqueado com reason adequado
 *    (pendente/cancelado/pausado/vencido) preservando email e role
 *  - Login bem-sucedido: redireciona por role (master/admin/employee->dashboard)
 * Todo o fluxo usa mocks de next/navigation e next-auth; não acessa rede, DB,
 * Supabase nem Asaas.
 */

let pushed: string[] = [];

jest.mock("next/navigation", () => {
  const useSearchParams = jest.fn(() => new URLSearchParams());
  const useRouter = jest.fn(() => ({
    push: (url: string) => {
      pushed.push(url);
    },
  }));
  const Link = ({ children, href }: any) => (
    <a data-link-href={href}>{children}</a>
  );
  Link.__esModule = true;
  Link.default = Link;
  return { useSearchParams, useRouter, Link };
});

const mockSignIn = jest.fn();

jest.mock("next-auth/react", () => ({
  signIn: (...args: any[]) => mockSignIn(...args),
}));

global.IntersectionObserver = jest.fn(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
})) as any;

// jsdom nao suporta canvas.getContext; o componente Sparkles chama esse metodo.
// Mocka para nao quebrar o render de paginas que usam Sparkles via AuthLayout.
HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
  fillRect: jest.fn(),
  clearRect: jest.fn(),
  getImageData: jest.fn(),
  putImageData: jest.fn(),
  createLinearGradient: jest.fn(() => ({ addColorStop: jest.fn() })),
  stroke: jest.fn(),
  beginPath: jest.fn(),
  moveTo: jest.fn(),
  lineTo: jest.fn(),
  arc: jest.fn(),
  fill: jest.fn(),
  restore: jest.fn(),
  save: jest.fn(),
  translate: jest.fn(),
  rotate: jest.fn(),
  scale: jest.fn(),
  setTransform: jest.fn(),
  transform: jest.fn(),
  resetTransform: jest.fn(),
  drawImage: jest.fn(),
  measureText: jest.fn(() => ({ width: 0 })),
  font: "",
  fillStyle: "",
  strokeStyle: "",
  lineWidth: 1,
  globalAlpha: 1,
  textAlign: "start",
  textBaseline: "alphabetic",
  direction: "inherit",
  imageSmoothingEnabled: true,
}) as any);

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import LoginPage from "../app/login/page";
import "@testing-library/jest-dom";

beforeEach(() => {
  jest.clearAllMocks();
  pushed = [];
  mockSignIn.mockReset();
  global.fetch = jest.fn();
});

describe("Fluxo de login", () => {
  it("credenciais invalidas mostram erro e nao redirecionam", async () => {
    mockSignIn.mockResolvedValue({ error: "CredentialsSignin" });

    render(<LoginPage />);

    const emailInput = document.getElementById("login-email") as HTMLInputElement;
    const senhaInput = document.getElementById("login-password") as HTMLInputElement;

    fireEvent.change(emailInput, {
      target: { value: "usuario@test.com" },
    });
    fireEvent.change(senhaInput, {
      target: { value: "senhaErrada" },
    });
    fireEvent.click(screen.getByRole("button", { name: /entrar/i }));

    await waitFor(() =>
      expect(screen.getByText("Email ou senha inválidos")).toBeInTheDocument(),
    );
    expect(pushed).toEqual([]);
  });

  it.each([
    ["aguardando aprovação", "pendente"],
    ["cancelada", "cancelado"],
    ["Pagamento Pendente", "pausado"],
    ["mensalidade", "vencido"],
  ])("erro de acesso %s redireciona para /bloqueado com reason=%s", async (erro, reason) => {
    mockSignIn.mockResolvedValue({
      error: `[ROLE:admin] ${erro}`,
    });

    render(<LoginPage />);

    const emailInput = document.getElementById("login-email") as HTMLInputElement;
    const senhaInput = document.getElementById("login-password") as HTMLInputElement;

    fireEvent.change(emailInput, {
      target: { value: "admin@test.com" },
    });
    fireEvent.change(senhaInput, {
      target: { value: "qualquer" },
    });
    fireEvent.click(screen.getByRole("button", { name: /entrar/i }));

    await waitFor(() => expect(pushed.length).toBeGreaterThan(0));
    const url = pushed[0];
    expect(url).toContain(`/bloqueado?reason=${reason}`);
    expect(url).toContain("email=admin%40test.com");
    expect(url).toContain("role=admin");
  });

  it("login bem-sucedido de admin redireciona para /admin", async () => {
    mockSignIn.mockResolvedValue({});

    global.fetch = jest.fn().mockResolvedValue({
      json: async () => ({ user: { role: "admin" } }),
    } as any);

    render(<LoginPage />);

    const emailInput = document.getElementById("login-email") as HTMLInputElement;
    const senhaInput = document.getElementById("login-password") as HTMLInputElement;

    fireEvent.change(emailInput, {
      target: { value: "admin@test.com" },
    });
    fireEvent.change(senhaInput, {
      target: { value: "senha123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /entrar/i }));

    await waitFor(() => expect(pushed[0]).toBe("/admin"));
  });

  it("login bem-sucedido de funcionario redireciona para /dashboard", async () => {
    mockSignIn.mockResolvedValue({});

    global.fetch = jest.fn().mockResolvedValue({
      json: async () => ({ user: { role: "employee" } }),
    } as any);

    render(<LoginPage />);

    const emailInput = document.getElementById("login-email") as HTMLInputElement;
    const senhaInput = document.getElementById("login-password") as HTMLInputElement;

    fireEvent.change(emailInput, {
      target: { value: "func@test.com" },
    });
    fireEvent.change(senhaInput, {
      target: { value: "senha123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /entrar/i }));

    await waitFor(() => expect(pushed[0]).toBe("/dashboard"));
  });
});
