import NextAuth, { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/db";
import { avaliarAcesso, mensagemBloqueio } from "@/lib/access";

/** Janela de revalidacao do JWT contra o banco (5 min). Limita a defasagem. */
const JWT_REVALIDAR_MS = 5 * 60 * 1000;

export const authOptions: AuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findFirst({
          where: {
            email: {
              equals: credentials.email,
              mode: "insensitive",
            },
          },
          include: {
            empresa: true,
          },
        });

        if (!user?.password) {
          return null;
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password,
        );

        if (!isPasswordValid) {
          return null;
        }

        // ✅ BLOQUEIOS SaaS (apenas para não-masters)
        if (user.role !== "master") {
          const acesso = avaliarAcesso({
            role: user.role,
            status: user.empresa?.status ?? null,
            vencimentoPlano: user.empresa?.vencimentoPlano ?? null,
            liberacaoTemporariaAte:
              (user.empresa as any)?.liberacaoTemporariaAte ?? null,
            temAssinatura: Boolean(user.empresa?.asaasSubscriptionId),
          });

          if (!acesso.permitido) {
            const roleTag =
              user.role === "admin" ? "[ROLE:admin]" : "[ROLE:employee]";
            throw new Error(`${roleTag}${mensagemBloqueio(acesso)}`);
          }
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name || user.nome || "",
          role: user.role,
          empresaId: user.empresaId,
          empresaNome: user.empresa?.nome,
          empresaStatus: (user.empresa as any)?.status || null,
          vencimentoPlano: user.empresa?.vencimentoPlano?.toISOString(),
          liberacaoTemporariaAte: (
            user.empresa as any
          )?.liberacaoTemporariaAte?.toISOString(),
          empresaTemAssinatura: Boolean(user.empresa?.asaasSubscriptionId),
          empresaCriacao: user.empresa?.createdAt?.toISOString() ?? null,
          tourCompleted: user.tourCompleted,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 4 * 60 * 60, // 4 horas (reduzido para maior segurança)
  },
  callbacks: {
    async signIn() {
      // Permitir o login
      return true;
    },
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.role = user.role;
        token.empresaId = user.empresaId;
        token.empresaNome = user.empresaNome;
        token.empresaStatus = user.empresaStatus;
        token.vencimentoPlano = user.vencimentoPlano;
        token.liberacaoTemporariaAte = user.liberacaoTemporariaAte;
        token.empresaTemAssinatura = (user as any).empresaTemAssinatura ?? null;
        token.empresaCriacao = (user as any).empresaCriacao ?? null;
        token.tourCompleted = user.tourCompleted;
        token.lastActivity = Date.now();
        token.dadosAtualizadosEm = Date.now();
      }

      if (trigger === "update") {
        token.lastActivity = Date.now();
        if (session?.tourCompleted !== undefined) {
          token.tourCompleted = session.tourCompleted;
        }
        if (session?.empresaStatus !== undefined) {
          token.empresaStatus = session.empresaStatus;
        }
        // update forca revalidacao do vencimento/status no banco abaixo.
        token.dadosAtualizadosEm = 0;
      }

      // Revalida a empresa no banco de forma PERIODICA (nao so quando o token
      // ja bloqueia). Cobre os DOIS sentidos:
      //  - liberar acesso apos pagamento confirmado;
      //  - BLOQUEAR acesso apos mudanca de status/vencimento (ex.: CANCELADO),
      //    que antes ficava liberado ate o token expirar.
      // Roda em toda leitura de sessao no runtime Node (getServerSession e
      // /api/auth/session via SessionProvider). O middleware Edge nao roda este
      // callback: sua defasagem fica limitada pelo maxAge da sessao (4h).
      const precisaRevalidar =
        !user &&
        !!token.empresaId &&
        token.role !== "master" &&
        (trigger === "update" ||
          !token.dadosAtualizadosEm ||
          Date.now() - (token.dadosAtualizadosEm as number) > JWT_REVALIDAR_MS);

      if (precisaRevalidar) {
        const empresa = await prisma.empresa.findUnique({
          where: { id: token.empresaId as string },
          select: {
            status: true,
            vencimentoPlano: true,
            liberacaoTemporariaAte: true,
            createdAt: true,
            asaasSubscriptionId: true,
          },
        });

        if (empresa) {
          token.empresaStatus = empresa.status;
          token.vencimentoPlano = empresa.vencimentoPlano?.toISOString() ?? null;
          token.liberacaoTemporariaAte =
            empresa.liberacaoTemporariaAte?.toISOString() ?? null;
          token.empresaTemAssinatura = Boolean(empresa.asaasSubscriptionId);
          token.empresaCriacao = empresa.createdAt?.toISOString() ?? null;
        }
        token.dadosAtualizadosEm = Date.now();
      }

      return token;
    },
    async session({ session, token }) {
      if (token && Object.keys(token).length > 0) {
        session.user.id = token.sub as string;
        session.user.role = token.role as string;
        session.user.empresaId = token.empresaId as string;
        session.user.empresaNome = token.empresaNome as string;
        session.user.empresaStatus = token.empresaStatus as string;
        session.user.vencimentoPlano = token.vencimentoPlano as string;
        session.user.liberacaoTemporariaAte = token.liberacaoTemporariaAte as
          | string
          | undefined;
        session.user.tourCompleted = token.tourCompleted as boolean;
        session.user.empresaTemAssinatura =
          (token.empresaTemAssinatura as boolean | null) ?? null;
        session.user.empresaCriacao =
          (token.empresaCriacao as string | null) ?? null;
        session.lastActivity = token.lastActivity as number;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
};

export default NextAuth(authOptions);
