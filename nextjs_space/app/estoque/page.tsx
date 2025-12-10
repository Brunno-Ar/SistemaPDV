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
  if (
    session.user.role !== "admin" &&
    session.user.role !== "master" &&
    session.user.role !== "gerente"
  ) {
    redirect("/vender");
  }

  return (
    <>
      <div className="max-w-7xl mx-auto p-4">
        <EstoqueClient />
      </div>
    </>
  );
}
