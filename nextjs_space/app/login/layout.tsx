import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login | FlowPDV - Sistema de Gestão",
  description:
    "Acesse sua conta FlowPDV para gerenciar vendas, estoque e equipe. Sistema de PDV completo para o seu negócio.",
  openGraph: {
    title: "Login | FlowPDV - Sistema de Gestão",
    description:
      "Acesse sua conta FlowPDV para gerenciar vendas, estoque e equipe.",
  },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
