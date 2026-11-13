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
      empresaTemAssinatura?: boolean | null;
      tourCompleted?: boolean;
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
    empresaTemAssinatura?: boolean | null;
    tourCompleted?: boolean;
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
    empresaTemAssinatura?: boolean | null;
    lastActivity?: number;
    tourCompleted?: boolean;
    /** Epoch ms da ultima revalidacao do token contra o banco. */
    dadosAtualizadosEm?: number;
  }
}
