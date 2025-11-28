import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

import EstoqueClient from "./_components/estoque-client";

export default async function EstoquePage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  console.log("Estoque Page Session Role:", session.user.role);

  // Verificar se é Admin ou Master
  if (session.user.role !== "admin" && session.user.role !== "master") {
    redirect("/vender");
  }

  return (
    <>
      <div className="max-w-7xl mx-auto p-4">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">
            Gerenciamento de Estoque
          </h1>
          <p className="text-gray-600">
            Gerencie produtos, preços e quantidades em estoque
          </p>
        </div>
        <EstoqueClient />
      </div>
    </>
  );
}
