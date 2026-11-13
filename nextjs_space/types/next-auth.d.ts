import NextAuth from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: string;
      empresaId?: string | null;
      empresaNome?: string | null;
      empresaStatus?: string | null;
      status?: string | null;
      vencimentoPlano?: string | null;
      liberacaoTemporariaAte?: string | null;
      tourCompleted?: boolean;
      empresaTemAssinatura?: boolean | null;
      empresaCriacao?: string | null;
    };
    lastActivity?: number;
  }

  interface User {
    role: string;
    empresaId?: string | null;
    empresaNome?: string | null;
    empresaStatus?: string | null;
    status?: string | null;
    vencimentoPlano?: string | null;
    liberacaoTemporariaAte?: string | null;
    tourCompleted?: boolean;
      empresaTemAssinatura?: boolean | null;
      empresaCriacao?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: string;
    empresaId?: string | null;
    empresaNome?: string | null;
    empresaStatus?: string | null;
    status?: string | null;
    vencimentoPlano?: string | null;
    liberacaoTemporariaAte?: string | null;
    lastActivity?: number;
    tourCompleted?: boolean;
    empresaTemAssinatura?: boolean | null;
    empresaCriacao?: string | null;
  }
}
