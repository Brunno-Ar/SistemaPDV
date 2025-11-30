import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    // Rotas exclusivas do MASTER
    if (path.startsWith("/master")) {
      if (token?.role !== "master") {
        return NextResponse.redirect(new URL("/vender", req.url));
      }
    }

    // Rotas exclusivas do ADMIN (estoque, relatorios, equipe, movimentacoes, admin, lotes)
    if (
      path.startsWith("/estoque") ||
      path.startsWith("/relatorios") ||
      path.startsWith("/equipe") ||
      path.startsWith("/movimentacoes") ||
      path.startsWith("/estoque-baixo") ||
      path.startsWith("/admin") ||
      path.startsWith("/lotes")
    ) {
      if (token?.role !== "admin" && token?.role !== "master") {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    }

    // APIs exclusivas do MASTER
    if (path.startsWith("/api/master")) {
      if (token?.role !== "master") {
        return NextResponse.json(
          { error: "Acesso negado. Apenas usuários master." },
          { status: 403 }
        );
      }
    }

    // APIs exclusivas do ADMIN
    if (path.startsWith("/api/admin")) {
      if (token?.role !== "admin" && token?.role !== "master") {
        return NextResponse.json(
          { error: "Acesso negado. Apenas administradores." },
          { status: 403 }
        );
      }
    }
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Permitir acesso às rotas de auth
        if (
          req.nextUrl.pathname === "/" ||
          req.nextUrl.pathname.startsWith("/api/auth") ||
          req.nextUrl.pathname.startsWith("/login") ||
          req.nextUrl.pathname.startsWith("/signup") ||
          req.nextUrl.pathname.startsWith("/api/signup")
        ) {
          return true;
        }

        // Verificar se tem token válido para outras rotas protegidas
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    "/((?!api/auth|api/profile|login|signup|_next/static|_next/image|favicon.ico|public).*)",
  ],
};
