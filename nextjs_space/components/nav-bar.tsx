
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
  Home,
  Menu,
  X,
  Calendar
} from 'lucide-react'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useState } from 'react'

export function NavBar() {
  const { data: session } = useSession()
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

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
      href: '/admin',
      label: 'Dashboard',
      icon: Home,
    },
    {
      href: '/vender',
      label: 'Vender',
      icon: ShoppingCart,
    },
    {
      href: '/estoque', 
      label: 'Estoque',
      icon: Package,
    },
    {
      href: '/lotes',
      label: 'Lotes',
      icon: Calendar,
    },
    {
      href: '/movimentacoes',
      label: 'Vendas',
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
    },
    {
      href: '/minha-conta',
      label: 'Minha Conta',
      icon: User,
    }
  ]

  // Navegação para CAIXA
  const caixaNavItems = [
    {
      href: '/dashboard',
      label: 'Dashboard',
      icon: Home,
    },
    {
      href: '/vender',
      label: 'Vender',
      icon: ShoppingCart,
    },
    {
      href: '/minha-conta',
      label: 'Minha Conta',
      icon: User,
    }
  ]

  const navItems = isMaster ? masterNavItems : isAdmin ? adminNavItems : caixaNavItems

  return (
    <nav className="bg-white shadow-sm border-b sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo/Brand */}
          <div className="flex items-center space-x-4">
            <h1 className="text-sm sm:text-base font-bold text-blue-600">
              Sistema PDV {isMaster && '(Master)'}
            </h1>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-2">
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
                    <span className="hidden xl:inline">{item.label}</span>
                  </Button>
                </Link>
              )
            })}

            {/* User Info */}
            <div className="hidden xl:flex items-center space-x-2 text-sm text-gray-600 border-l pl-4 ml-2">
              <User className="h-4 w-4" />
              <span className="max-w-[150px] truncate">{session.user.name}</span>
              {session.user.empresaNome && !isMaster && (
                <span className="text-xs text-gray-500 max-w-[100px] truncate">
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
              <LogOut className="h-4 w-4 xl:mr-2" />
              <span className="hidden xl:inline">Sair</span>
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t py-4 space-y-2">
            {/* User Info Mobile */}
            <div className="px-4 py-2 bg-gray-50 rounded-lg mb-4">
              <div className="flex items-center space-x-2 text-sm">
                <User className="h-4 w-4 text-gray-600" />
                <span className="font-medium">{session.user.name}</span>
              </div>
              {session.user.empresaNome && !isMaster && (
                <div className="text-xs text-gray-500 ml-6">
                  {session.user.empresaNome}
                </div>
              )}
              <div className="mt-2">
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded font-medium">
                  {role === 'master' ? 'Master' : role === 'admin' ? 'Admin' : 'Caixa'}
                </span>
              </div>
            </div>

            {/* Navigation Items Mobile */}
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <Link 
                  key={item.href} 
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Button
                    variant={pathname === item.href ? "default" : "ghost"}
                    className={cn(
                      "w-full justify-start space-x-2",
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

            {/* Logout Mobile */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setMobileMenuOpen(false)
                signOut({ callbackUrl: '/login' })
              }}
              className="w-full justify-start text-red-600 hover:bg-red-50"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </Button>
          </div>
        )}
      </div>
    </nav>
  )
}
