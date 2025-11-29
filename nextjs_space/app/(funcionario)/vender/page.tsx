import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

import VenderClient from "./_components/vender-client";

export default async function VenderPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <>
      <div className="max-w-7xl mx-auto p-4">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Sistema de Vendas
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Gerencie suas vendas de forma rápida e eficiente
          </p>
        </div>
        <VenderClient />
      </div>
    </>
  );
}
