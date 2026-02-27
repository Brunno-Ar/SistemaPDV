import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    if (token && (path === "/login" || path === "/signup")) {
      if (token.role === "master") {
        return NextResponse.redirect(new URL("/master", req.url));
      }
      if (token.role === "gerente") {
        return NextResponse.redirect(new URL("/gerente", req.url));
      }
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    // Bloqueio SaaS: redirecionar empresas inadimplentes (exceto master e página bloqueado)
    if (
      token &&
      token.role !== "master" &&
      !path.startsWith("/bloqueado") &&
      !path.startsWith("/api/billing") &&
      !path.startsWith("/api/public") &&
      !path.startsWith("/api/auth")
    ) {
      const empresaStatus = token.empresaStatus as string;

      if (empresaStatus === "PAUSADO" || empresaStatus === "CANCELADO") {
        const liberacaoAte = token.liberacaoTemporariaAte as string | undefined;
        const hasValidRelease =
          liberacaoAte && new Date(liberacaoAte) > new Date();

        if (!hasValidRelease) {
          const role = token.role === "admin" ? "admin" : "employee";
          const reason =
            empresaStatus === "CANCELADO" ? "cancelado" : "pausado";
          const email = token.email || "";
          return NextResponse.redirect(
            new URL(
              `/bloqueado?reason=${reason}&email=${encodeURIComponent(email)}&role=${role}`,
              req.url,
            ),
          );
        }
      }
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
          { status: 403 },
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
          { status: 403 },
        );
      }
    }
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        if (
          req.nextUrl.pathname === "/" ||
          req.nextUrl.pathname.startsWith("/api/auth") ||
          req.nextUrl.pathname.startsWith("/login") ||
          req.nextUrl.pathname.startsWith("/signup") ||
          req.nextUrl.pathname.startsWith("/api/signup") ||
          req.nextUrl.pathname.startsWith("/api/webhooks") ||
          req.nextUrl.pathname.startsWith("/api/cupons/validate") ||
          req.nextUrl.pathname.startsWith("/bloqueado") ||
          req.nextUrl.pathname.startsWith("/api/billing") ||
          req.nextUrl.pathname.startsWith("/api/public")
        ) {
          return true;
        }

        return !!token;
      },
    },
  },
);

export const config = {
  matcher: [
    "/((?!api/auth|api/profile|api/webhooks|login|signup|_next/static|_next/image|favicon.ico|favicon.svg|favicon.png|logo.png|icon.png|apple-icon.png|sw.js|manifest.json|workbox-.*).*)",
  ],
};
