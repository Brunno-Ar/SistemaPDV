"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { usePathname } from "next/navigation";

export function PasswordChangeAlert() {
  const { data: session } = useSession();
  const pathname = usePathname();

  // Don't show on login or forgot-password pages
  if (pathname === "/login" || pathname === "/forgot-password") {
    return null;
  }

  if (!session?.user || !(session.user as any).mustChangePassword) {
    return null;
  }

  return (
    <div className="bg-amber-600 text-white px-4 py-3 text-center font-medium flex items-center justify-center gap-2 relative z-[100] shadow-md">
      <AlertTriangle className="w-5 h-5" />
      <span>
        🔐 Sua senha é temporária! Por favor,{" "}
        <Link
          href="/configuracoes"
          className="underline hover:text-amber-100 font-bold"
        >
          vá em Configurações &gt; Segurança
        </Link>{" "}
        e defina uma nova senha o quanto antes.
      </span>
    </div>
  );
}
