import NextAuth, { AuthOptions, User } from "next-auth";
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
          user.password
        );

        if (!isPasswordValid) {
          return null;
        }

        // ✅ BLOQUEIOS SaaS (apenas para não-masters)
        if (user.role !== "master" && user.empresa) {
          const empresa = user.empresa;
          const now = new Date();

          // 1. Empresa pendente de aprovação
          if (empresa.status === "PENDENTE") {
            throw new Error(
              "Sua empresa está aguardando aprovação do administrador. Tente novamente mais tarde."
            );
          }

          // 2. Empresa pausada/suspensa
          if (empresa.status === "PAUSADO") {
            throw new Error(
              "Acesso suspenso. Pagamento não identificado. Entre em contato com o suporte."
            );
          }

          // 3. Mensalidade vencida (apenas para empresas ativas)
          if (
            empresa.status === "ATIVO" &&
            empresa.vencimentoPlano
          ) {
            const toleranceDate = new Date(empresa.vencimentoPlano);
            toleranceDate.setDate(toleranceDate.getDate() + 10);

            if (now > toleranceDate) {
              throw new Error(
                "Acesso bloqueado. O pagamento da sua mensalidade não foi realizado. Entre em contato com o suporte."
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
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8 horas (sessão expira após 8h)
  },
  callbacks: {
    async signIn() {
      // Permitir o login
      return true;
    },
    async jwt({ token, user, trigger }) {
      // Se é um novo login, adiciona os dados do usuário
      if (user) {
        token.role = user.role;
        token.empresaId = user.empresaId;
        token.empresaNome = user.empresaNome;
        token.vencimentoPlano = user.vencimentoPlano;
        token.lastActivity = Date.now();
      }

      // Atualizar última atividade se for um update manual
      if (trigger === "update") {
        token.lastActivity = Date.now();
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
