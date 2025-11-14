
'use client'

import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { 
  ShoppingCart, 
  Package, 
  BarChart3, 
  LogOut,
  User,
  Building2,
  Users,
  TrendingDown,
  ArrowRightLeft,
  Home
} from 'lucide-react'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

export function NavBar() {
  const { data: session } = useSession()
  const pathname = usePathname()

  if (!session?.user) {
    return null
  }

  const role = session.user.role
  const isMaster = role === 'master'
  const isAdmin = role === 'admin'
  const isCaixa = role === 'caixa'

  // Navegação para MASTER
  const masterNavItems = [
    {
      href: '/master',
      label: 'Início',
      icon: Home,
    },
    {
      href: '/master/empresas',
      label: 'Empresas',
      icon: Building2,
    },
    {
      href: '/master/usuarios',
      label: 'Masters',
      icon: Users,
    }
  ]

  // Navegação para ADMIN
  const adminNavItems = [
    {
      href: '/vender',
      label: 'Início',
      icon: Home,
    },
    {
      href: '/estoque', 
      label: 'Estoque',
      icon: Package,
    },
    {
      href: '/movimentacoes',
      label: 'Movimentações',
      icon: ArrowRightLeft,
    },
    {
      href: '/estoque-baixo',
      label: 'Estoque Baixo',
      icon: TrendingDown,
    },
    {
      href: '/equipe',
      label: 'Equipe',
      icon: Users,
    },
    {
      href: '/relatorios',
      label: 'Relatórios', 
      icon: BarChart3,
    }
  ]

  // Navegação para CAIXA
  const caixaNavItems = [
    {
      href: '/vender',
      label: 'Início',
      icon: Home,
    }
  ]

  const navItems = isMaster ? masterNavItems : isAdmin ? adminNavItems : caixaNavItems

  return (
    <nav className="bg-white shadow-sm border-b sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo/Brand */}
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-bold text-blue-600">
              Sistema PDV {isMaster && '(Master)'}
            </h1>
          </div>

          {/* Navigation Links */}
          <div className="flex items-center space-x-2">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant={pathname === item.href ? "default" : "ghost"}
                    className={cn(
                      "flex items-center space-x-2",
                      pathname === item.href && "bg-blue-600 text-white"
                    )}
                    size="sm"
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Button>
                </Link>
              )
            })}

            {/* User Info */}
            <div className="flex items-center space-x-2 text-sm text-gray-600 border-l pl-4 ml-2">
              <User className="h-4 w-4" />
              <span>{session.user.name}</span>
              {session.user.empresaNome && !isMaster && (
                <span className="text-xs text-gray-500">
                  ({session.user.empresaNome})
                </span>
              )}
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded font-medium">
                {role === 'master' ? 'Master' : role === 'admin' ? 'Admin' : 'Caixa'}
              </span>
            </div>

            {/* Logout */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="text-red-600 hover:bg-red-50"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </div>
    </nav>
  )
}
