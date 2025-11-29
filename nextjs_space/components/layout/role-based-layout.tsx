"use client";

import { useSession } from "next-auth/react";
import {
  Sidebar,
  SidebarBody,
  SidebarLink,
  SidebarBrand,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Calendar,
  ArrowRightLeft,
  Users,
  BarChart3,
  User,
  LogOut,
  Store,
  Settings,
} from "lucide-react";
import { signOut } from "next-auth/react";

export default function RoleBasedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session } = useSession();
  const role = session?.user?.role;

  let links: any[] = [];

  if (role === "master") {
    links = [
      {
        label: "Dashboard",
        href: "/master",
        icon: <LayoutDashboard className="h-5 w-5 flex-shrink-0" />,
      },
      {
        label: "Empresas",
        href: "/master/empresas",
        icon: <Store className="h-5 w-5 flex-shrink-0" />,
      },
      {
        label: "Usuários",
        href: "/master/usuarios",
        icon: <Users className="h-5 w-5 flex-shrink-0" />,
      },
      {
        label: "Configurações",
        href: "/configuracoes",
        icon: <Settings className="h-5 w-5 flex-shrink-0" />,
      },
    ];
  } else if (role === "admin") {
    links = [
      {
        label: "Dashboard",
        href: "/admin",
        icon: <LayoutDashboard className="h-5 w-5 flex-shrink-0" />,
      },
      {
        label: "Vender",
        href: "/vender",
        icon: <ShoppingCart className="h-5 w-5 flex-shrink-0" />,
      },
      {
        label: "Estoque",
        href: "/estoque",
        icon: <Package className="h-5 w-5 flex-shrink-0" />,
      },
      {
        label: "Lotes",
        href: "/lotes",
        icon: <Calendar className="h-5 w-5 flex-shrink-0" />,
      },
      {
        label: "Movimentações",
        href: "/movimentacoes",
        icon: <ArrowRightLeft className="h-5 w-5 flex-shrink-0" />,
      },
      {
        label: "Equipe",
        href: "/equipe",
        icon: <Users className="h-5 w-5 flex-shrink-0" />,
      },
      {
        label: "Relatórios",
        href: "/relatorios",
        icon: <BarChart3 className="h-5 w-5 flex-shrink-0" />,
      },
      {
        label: "Minha Conta",
        href: "/minha-conta",
        icon: <User className="h-5 w-5 flex-shrink-0" />,
      },
      {
        label: "Configurações",
        href: "/configuracoes",
        icon: <Settings className="h-5 w-5 flex-shrink-0" />,
      },
    ];
  } else {
    // Caixa / Funcionário
    links = [
      {
        label: "Dashboard",
        href: "/dashboard",
        icon: <LayoutDashboard className="h-5 w-5 flex-shrink-0" />,
      },
      {
        label: "Vender",
        href: "/vender",
        icon: <ShoppingCart className="h-5 w-5 flex-shrink-0" />,
      },
      {
        label: "Minha Conta",
        href: "/minha-conta",
        icon: <User className="h-5 w-5 flex-shrink-0" />,
      },
      {
        label: "Configurações",
        href: "/configuracoes",
        icon: <Settings className="h-5 w-5 flex-shrink-0" />,
      },
    ];
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100 dark:bg-zinc-900 font-body">
      <Sidebar>
        <SidebarBody className="justify-between gap-10">
          <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
            <SidebarBrand />
            {/* Links */}
            <div className="flex flex-col gap-2">
              {links.map((link, idx) => (
                <SidebarLink key={idx} link={link} />
              ))}
            </div>
          </div>
          {/* Footer: Perfil e Sair */}
          <div onClick={() => signOut({ callbackUrl: "/login" })}>
            <SidebarLink
              link={{
                label: "Sair",
                href: "#",
                icon: <LogOut className="h-5 w-5 text-red-500" />,
              }}
            />
          </div>
        </SidebarBody>
      </Sidebar>
      {/* Conteúdo com Scroll Independente */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-white dark:bg-zinc-950 rounded-tl-2xl border border-gray-200 dark:border-zinc-800 m-2 ml-0 shadow-sm">
        {children}
      </main>
    </div>
  );
}
