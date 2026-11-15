/**
 * @jest-environment jsdom
 *
 * Testa o copy do trial nos componentes do landing:
 *  - Hero.tsx e FooterCTA leem TRIAL_DAYS de NEXT_PUBLIC_TRIAL_DAYS (env)
 *    com fallback 14 (fonte unica: lib/billing-policy);
 *  - Garante regressao se o copy voltar a hardcodear "30 dias".
 */

global.IntersectionObserver = jest.fn(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
})) as any;

import React from "react";
import { render, screen } from "@testing-library/react";
import { Hero } from "../app/(landing)/_components/Hero";
import { FooterCTA } from "../app/(landing)/_components/FooterCTA";
import "@testing-library/jest-dom";

jest.mock("next/link", () => {
  const Link = ({ children, href }: any) => (
    <a data-link-href={href}>{children}</a>
  );
  Link.__esModule = true;
  Link.default = Link;
  return Link;
});

describe("Landing trial copy (14 dias, fallback de NEXT_PUBLIC_TRIAL_DAYS)", () => {
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_TRIAL_DAYS;
  });

  it("Hero anuncia teste por 14 dias grátis (não 30)", () => {
    render(<Hero />);
    const cta = screen.getByText("Teste por 14 dias grátis");
    expect(cta).toBeInTheDocument();
    expect(screen.queryByText("Teste por 30 dias grátis")).not.toBeInTheDocument();
  });

  it("FooterCTA anuncia 14 dias de teste grátis (não 30)", () => {
    render(<FooterCTA />);
    const footer = screen.getByText(/14 dias de teste grátis/);
    expect(footer).toBeInTheDocument();
    expect(screen.queryByText(/30 dias de teste grátis/)).not.toBeInTheDocument();
  });
});
