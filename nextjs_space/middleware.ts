
import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const path = req.nextUrl.pathname

    // Allow access to the landing page for everyone
    if (path === '/') {
      return NextResponse.next();
    }

    // Rotas exclusivas do MASTER
    if (path.startsWith('/master')) {
      if (token?.role !== 'master') {
        return NextResponse.redirect(new URL('/vender', req.url))
      }
    }

    // Rotas exclusivas do ADMIN (estoque, relatorios, equipe, movimentacoes, admin, lotes)
    if (
      path.startsWith('/estoque') ||
      path.startsWith('/relatorios') ||
      path.startsWith('/equipe') ||
      path.startsWith('/movimentacoes') ||
      path.startsWith('/estoque-baixo') ||
      path.startsWith('/admin') ||
      path.startsWith('/lotes')
    ) {
      if (token?.role !== 'admin' && token?.role !== 'master') {
        return NextResponse.redirect(new URL('/dashboard', req.url))
      }
    }

    // APIs exclusivas do MASTER
    if (path.startsWith('/api/master')) {
      if (token?.role !== 'master') {
        return NextResponse.json(
          { error: 'Acesso negado. Apenas usuários master.' },
          { status: 403 }
        )
      }
    }

    // APIs exclusivas do ADMIN
    if (path.startsWith('/api/admin')) {
      if (token?.role !== 'admin' && token?.role !== 'master') {
        return NextResponse.json(
          { error: 'Acesso negado. Apenas administradores.' },
          { status: 403 }
        )
      }
    }
  },
   {
    // O `withAuth` já lida com a lógica de redirecionamento para login
    // se o usuário não estiver autenticado nas rotas protegidas.
    // O callback `authorized` é usado para lógicas mais complexas de autorização.
    // Aqui, estamos simplesmente garantindo que haja um token.
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
)

export const config = {
  // O matcher agora protege todas as rotas, EXCETO a página inicial,
  // as rotas de API (exceto as de admin/master que são protegidas acima),
  // a pasta `public`, e os arquivos estáticos do Next.js.
  matcher: [
    '/((?!api/auth|login|signup|public|_next/static|_next/image|favicon.ico|$).*)',
  ],
}
