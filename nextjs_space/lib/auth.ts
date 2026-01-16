import NextAuth, { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/db";

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
        if (user.role !== "master" && user.empresa) {
          const empresa: any = user.empresa;
          const status = empresa.status as string;
          const now = new Date();

          // 1. Empresa pendente de aprovação
          if (status === "PENDENTE") {
            throw new Error(
              "Sua empresa está aguardando aprovação do administrador. Tente novamente mais tarde.",
            );
          }

          // 2. Empresa pausada/suspensa
          if (status === "PAUSADO") {
            const liberacaoAte = empresa.liberacaoTemporariaAte;
            // Se tiver liberação temporária válida, permite o acesso
            if (liberacaoAte && new Date(liberacaoAte) > now) {
              // Acesso liberado temporariamente
            } else {
              throw new Error("Pagamento Pendente. Regularize para acessar.");
            }
          }

          // 3. Mensalidade vencida (apenas para empresas ativas ou em teste)
          if (
            (status === "ATIVO" || status === "EM_TESTE") &&
            empresa.vencimentoPlano
          ) {
            const toleranceDate = new Date(empresa.vencimentoPlano);
            // Tolerância de 10 dias apenas para ATIVO. EM_TESTE bloqueia imediatamente?
            // User disse: "O bloqueio só acontece se ele não pagar após 14 dias" (referindo-se ao trial)
            // Vou dar 1 dia de tolerância para o trial para evitar bloqueio no minuto exato
            const toleranceDays = status === "EM_TESTE" ? 1 : 10;
            toleranceDate.setDate(toleranceDate.getDate() + toleranceDays);

            if (now > toleranceDate) {
              throw new Error(
                "Acesso bloqueado. O pagamento da sua mensalidade não foi realizado. Entre em contato com o suporte.",
              );
            }
          }
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name || user.nome || "",
          role: user.role,
          empresaId: user.empresaId,
          empresaNome: user.empresa?.nome,
          vencimentoPlano: user.empresa?.vencimentoPlano?.toISOString(),
          liberacaoTemporariaAte: (
            user.empresa as any
          )?.liberacaoTemporariaAte?.toISOString(),
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
      // Se é um novo login, adiciona os dados do usuário
      if (user) {
        token.role = user.role;
        token.empresaId = user.empresaId;
        token.empresaNome = user.empresaNome;
        token.vencimentoPlano = user.vencimentoPlano;
        token.liberacaoTemporariaAte = user.liberacaoTemporariaAte;
        token.tourCompleted = user.tourCompleted;
        token.lastActivity = Date.now();
      }

      // Atualizar última atividade se for um update manual
      if (trigger === "update") {
        token.lastActivity = Date.now();
        if (session?.tourCompleted !== undefined) {
          token.tourCompleted = session.tourCompleted;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (token && Object.keys(token).length > 0) {
        session.user.id = token.sub as string;
        session.user.role = token.role as string;
        session.user.empresaId = token.empresaId as string;
        session.user.empresaNome = token.empresaNome as string;
        session.user.vencimentoPlano = token.vencimentoPlano as string;
        session.user.liberacaoTemporariaAte = token.liberacaoTemporariaAte as
          | string
          | undefined;
        session.user.tourCompleted = token.tourCompleted as boolean;
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
