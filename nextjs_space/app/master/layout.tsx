"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Store,
  Users,
  Settings,
  HelpCircle,
  LogOut,
} from "lucide-react";

export default function MasterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session } = useSession();
  const pathname = usePathname();

  const isActive = (path: string) => {
    return pathname === path || pathname?.startsWith(`${path}/`);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#f6f7f8] dark:bg-[#101922] font-sans text-[#101922] dark:text-gray-200">
      {/* SideNavBar */}
      <aside className="w-64 flex-shrink-0 flex flex-col justify-between border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-[#182635] overflow-y-auto p-4">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3 p-2">
            <div
              className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10"
              style={{
                backgroundImage:
                  'url("https://lh3.googleusercontent.com/aida-public/AB6AXuBDkX6a-rs8abZd-enZeMXN34hP9z_d7X9Lxvdi041ybFLpQrH0EVbD22tLqfSkzEvyfvKv1QWL4-5-iqVh-VTOSTxM7MS5goHNuvHtmtrKzpjdOSjvQO48zFo-7YN_IfjswoegioBNkKKqC7UGatqXKM8G-T0ha6_zLCv8704BbC-1GILcvqXr6s5pIA03ZyVI5IoLq6lMsIdrkYP0Kc2wRoXQKYUmnFfl0tRwO5kA7pxFyhtIa2a4XpZDChL77XLRusouWerAtjYc")',
              }}
            ></div>
            <div className="flex flex-col">
              <h1 className="text-base font-bold text-gray-800 dark:text-white">
                {session?.user?.name || "Usuário Master"}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {session?.user?.email || "master@email.com"}
              </p>
            </div>
          </div>
          <nav className="flex flex-col gap-2 mt-4">
            <Link
              href="/master"
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                pathname === "/master"
                  ? "bg-[#137fec]/10 text-[#137fec]"
                  : "hover:bg-[#137fec]/10"
              }`}
            >
              <LayoutDashboard className="h-5 w-5" />
              <p
                className={`text-sm ${
                  pathname === "/master" ? "font-bold" : "font-medium"
                }`}
              >
                Dashboard
              </p>
            </Link>
            <Link
              href="/master/empresas"
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                isActive("/master/empresas")
                  ? "bg-[#137fec]/10 text-[#137fec]"
                  : "hover:bg-[#137fec]/10"
              }`}
            >
              <Store className="h-5 w-5" />
              <p
                className={`text-sm ${
                  isActive("/master/empresas") ? "font-bold" : "font-medium"
                }`}
              >
                Empresas
              </p>
            </Link>
            <Link
              href="/master/usuarios"
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                isActive("/master/usuarios")
                  ? "bg-[#137fec]/10 text-[#137fec]"
                  : "hover:bg-[#137fec]/10"
              }`}
            >
              <Users className="h-5 w-5" />
              <p
                className={`text-sm ${
                  isActive("/master/usuarios") ? "font-bold" : "font-medium"
                }`}
              >
                Usuários
              </p>
            </Link>
            <Link
              href="#"
              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[#137fec]/10 transition-colors"
            >
              <Settings className="h-5 w-5" />
              <p className="text-sm font-medium">Configurações</p>
            </Link>
          </nav>
        </div>
        <div className="flex flex-col gap-2">
          <Link
            href="#"
            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[#137fec]/10 transition-colors"
          >
            <HelpCircle className="h-5 w-5" />
            <p className="text-sm font-medium">Ajuda</p>
          </Link>
          <Link href="/api/auth/signout">
            <button className="flex w-full cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-lg h-10 px-4 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-white text-sm font-bold leading-normal tracking-[0.015em] transition-colors">
              <LogOut className="h-5 w-5" />
              <span className="truncate">Sair</span>
            </button>
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-8">{children}</main>
    </div>
  );
}
