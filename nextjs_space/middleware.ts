import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    // Se o usuário já estiver logado e tentar acessar login ou signup, redireciona para a home correta
    if (token && (path === "/login" || path === "/signup")) {
      if (token.role === "master") {
        return NextResponse.redirect(new URL("/master", req.url));
      }
      if (token.role === "gerente") {
        return NextResponse.redirect(new URL("/gerente", req.url));
      }
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    // Rotas exclusivas do MASTER
    if (path.startsWith("/master")) {
      if (token?.role !== "master") {
        return NextResponse.redirect(new URL("/vender", req.url));
      }
    }

    // Redirecionamento inteligente do /dashboard
    if (path === "/dashboard") {
      if (token?.role === "gerente") {
        return NextResponse.redirect(new URL("/gerente", req.url));
      }
      if (token?.role === "master") {
        return NextResponse.redirect(new URL("/master", req.url));
      }
    }

    // Rotas exclusivas do GERENTE (Dashboard próprio)
    if (path.startsWith("/gerente")) {
      if (token?.role !== "gerente") {
        return NextResponse.redirect(new URL("/login", req.url));
      }
    }

    // Rotas exclusivas do ADMIN/GERENTE (estoque, relatorios, movimentacoes, admin, lotes)
    if (
      path.startsWith("/estoque") ||
      path.startsWith("/relatorios") ||
      path.startsWith("/movimentacoes") ||
      path.startsWith("/estoque-baixo") ||
      path.startsWith("/admin") ||
      path.startsWith("/lotes")
    ) {
      // Se for gerente tentando acessar /admin, redireciona para /gerente (dashboard dele)
      if (path.startsWith("/admin") && token?.role === "gerente") {
        return NextResponse.redirect(new URL("/gerente", req.url));
      }

      if (
        token?.role !== "admin" &&
        token?.role !== "master" &&
        token?.role !== "gerente"
      ) {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    }

    // Rotas EXCLUSIVAS DE ADMIN (equipe, configurações financeiras) - Gerente NÃO acessa
    if (path.startsWith("/equipe")) {
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

    // APIs exclusivas do ADMIN/GERENTE
    if (path.startsWith("/api/admin")) {
      if (
        token?.role !== "admin" &&
        token?.role !== "master" &&
        token?.role !== "gerente"
      ) {
        return NextResponse.json(
          { error: "Acesso negado. Apenas administradores e gerentes." },
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
          req.nextUrl.pathname.startsWith("/api/signup") ||
          req.nextUrl.pathname.startsWith("/api/webhooks")
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
    "/((?!api/auth|api/profile|api/webhooks|login|signup|_next/static|_next/image|favicon.ico|favicon.svg|sw.js|manifest.json|workbox-.*).*)",
  ],
};
