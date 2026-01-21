"use client";

import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { useState } from "react";
import {
  Sidebar,
  SidebarBody,
  SidebarLink,
  SidebarBrand,
  useSidebar,
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
  CreditCard,
  StickyNote,
  Wallet,
} from "lucide-react";
import { useLogout } from "@/hooks/use-logout";
import { LogoutConfirmationDialog } from "@/components/layout/logout-confirmation-dialog";
import { FechamentoCaixaDialog } from "@/app/(funcionario)/dashboard/_components/fechamento-caixa-dialog";

const SidebarUserInfo = ({ session }: { session: any }) => {
  const { open } = useSidebar();

  if (!session?.user) return null;

  const isMaster = session.user.role === "master";

  return (
    <motion.div
      animate={{
        display: open ? "block" : "none",
        opacity: open ? 1 : 0,
      }}
      className="px-2 py-1 mb-4 text-xs border-b border-white/20 pb-2 text-white"
    >
      <p className="font-medium truncate">
        {isMaster ? "Painel Master" : session.user.empresaNome || "Empresa"}
      </p>
      <p className="truncate opacity-80">
        {isMaster
          ? "Administrador do Sistema"
          : `${session.user.role} | ${session.user.name?.split(" ")[0]}`}
      </p>
    </motion.div>
  );
};

export default function RoleBasedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session } = useSession();
  const role = session?.user?.role;
  const {
    checkCaixaStatus,
    performLogoutWithClosing,
    performLogoutWithoutClosing,
    isLoggingOut,
    isCheckingCaixa,
  } = useLogout();

  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [showFechamentoDialog, setShowFechamentoDialog] = useState(false);
  const [saldoInicialCaixa, setSaldoInicialCaixa] = useState(0);

  const handleLogoutClick = async () => {
    const status = await checkCaixaStatus();

    if (status?.caixaAberto) {
      setSaldoInicialCaixa(status.saldoInicial || 0);
      setShowLogoutDialog(true);
    } else {
      performLogoutWithoutClosing("/login");
    }
  };

  const handleOpenFechamento = () => {
    setShowLogoutDialog(false);
    setShowFechamentoDialog(true);
  };

  const handleFechamentoSuccess = () => {
    setShowFechamentoDialog(false);
    performLogoutWithoutClosing("/login");
  };

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
        label: "Cupons",
        href: "/master/cupons",
        icon: <CreditCard className="h-5 w-5 flex-shrink-0" />,
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
  } else if (role === "gerente") {
    links = [
      {
        label: "Dashboard",
        href: "/gerente",
        icon: <LayoutDashboard className="h-5 w-5 flex-shrink-0" />,
      },
      {
        label: "Vender",
        href: "/vender",
        icon: <ShoppingCart className="h-5 w-5 flex-shrink-0" />,
        id: "menu-vender",
      },
      {
        label: "Estoque",
        href: "/estoque",
        icon: <Package className="h-5 w-5 flex-shrink-0" />,
        id: "menu-estoque",
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
        id: "menu-movimentacoes",
      },
      {
        label: "Minha Conta",
        href: "/minha-conta",
        icon: <User className="h-5 w-5 flex-shrink-0" />,
      },
      {
        label: "Anotações",
        href: "/anotacoes",
        icon: <StickyNote className="h-5 w-5 flex-shrink-0" />,
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
        label: "Caixa",
        href: "/admin/caixa",
        icon: <Wallet className="h-5 w-5 flex-shrink-0" />,
      },
      {
        label: "Vender",
        href: "/vender",
        icon: <ShoppingCart className="h-5 w-5 flex-shrink-0" />,
        id: "menu-vender",
      },
      {
        label: "Estoque",
        href: "/estoque",
        icon: <Package className="h-5 w-5 flex-shrink-0" />,
        id: "menu-estoque",
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
        id: "menu-movimentacoes",
      },
      {
        label: "Equipe",
        href: "/equipe",
        icon: <Users className="h-5 w-5 flex-shrink-0" />,
        id: "menu-equipe",
      },
      {
        label: "Relatórios",
        href: "/relatorios",
        icon: <BarChart3 className="h-5 w-5 flex-shrink-0" />,
        id: "menu-relatorios",
      },
      {
        label: "Minha Conta",
        href: "/minha-conta",
        icon: <User className="h-5 w-5 flex-shrink-0" />,
      },
      {
        label: "Assinatura",
        href: "/admin/assinatura",
        icon: <CreditCard className="h-5 w-5 flex-shrink-0" />,
      },
      {
        label: "Anotações",
        href: "/anotacoes",
        icon: <StickyNote className="h-5 w-5 flex-shrink-0" />,
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
        id: "menu-vender",
      },
      {
        label: "Minha Conta",
        href: "/minha-conta",
        icon: <User className="h-5 w-5 flex-shrink-0" />,
        id: "menu-minha-conta",
      },
      {
        label: "Anotações",
        href: "/anotacoes",
        icon: <StickyNote className="h-5 w-5 flex-shrink-0" />,
      },
      {
        label: "Configurações",
        href: "/configuracoes",
        icon: <Settings className="h-5 w-5 flex-shrink-0" />,
      },
    ];
  }

  return (
    <div className="flex flex-col lg:flex-row h-full overflow-hidden bg-gray-100 dark:bg-zinc-900 font-body">
      <Sidebar>
        <SidebarBody className="justify-between gap-10">
          <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide">
            <SidebarBrand />
            <SidebarUserInfo session={session} />
            {/* Links */}
            <div className="flex flex-col gap-2">
              {links.map((link, idx) => (
                <SidebarLink key={idx} link={link} />
              ))}
            </div>
          </div>
          {/* Footer: Perfil e Sair */}
          <div
            onClick={handleLogoutClick}
            className={
              isLoggingOut || isCheckingCaixa
                ? "opacity-50 pointer-events-none"
                : "cursor-pointer"
            }
          >
            <SidebarLink
              link={{
                label: isLoggingOut
                  ? "Saindo..."
                  : isCheckingCaixa
                  ? "Verificando..."
                  : "Sair",
                href: "#",
                icon: <LogOut className="h-5 w-5 text-red-500" />,
              }}
            />
          </div>
        </SidebarBody>
      </Sidebar>

      {/* Dialog de confirmação de logout */}
      <LogoutConfirmationDialog
        open={showLogoutDialog}
        onOpenChange={setShowLogoutDialog}
        onLogoutWithClosing={() => performLogoutWithClosing("/login")}
        onLogoutWithoutClosing={() => performLogoutWithoutClosing("/login")}
        onOpenFechamento={handleOpenFechamento}
        isLoading={isLoggingOut}
      />

      {/* Dialog de fechamento de caixa */}
      <FechamentoCaixaDialog
        open={showFechamentoDialog}
        onOpenChange={setShowFechamentoDialog}
        onSuccess={handleFechamentoSuccess}
        saldoInicial={saldoInicialCaixa}
      />

      {/* Conteúdo com Scroll Independente */}
      <main className="flex-1 overflow-y-auto p-4 lg:p-8 bg-white dark:bg-zinc-950 lg:rounded-tl-2xl border-t lg:border-l border-gray-200 dark:border-zinc-800 lg:m-2 lg:ml-0 shadow-sm">
        {children}
      </main>
    </div>
  );
}
