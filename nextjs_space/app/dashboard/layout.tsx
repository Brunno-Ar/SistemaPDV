"use client";

import {
  Sidebar,
  SidebarBody,
  SidebarLink,
  SidebarBrand,
} from "@/components/ui/sidebar";
import { LayoutDashboard, ShoppingCart, User, LogOut } from "lucide-react";
import { signOut } from "next-auth/react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const links = [
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
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100 dark:bg-neutral-900 font-body">
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
          <div onClick={() => signOut()}>
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
      <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-white dark:bg-neutral-950 rounded-tl-2xl border border-neutral-200 dark:border-neutral-700 m-2 ml-0 shadow-sm">
        {children}
      </main>
    </div>
  );
}
