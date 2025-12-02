import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";

import RelatoriosClient from "./_components/relatorios-client";

export default async function RelatoriosPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  // Verificar se é Admin
  if (session.user.role !== "admin" && session.user.role !== "master" && session.user.role !== "gerente") {
    redirect("/vender");
  }

  return (
    <>
      <div className="max-w-7xl mx-auto p-4">
        <PageHeader
          title="Relatórios e Dashboard"
          description="Acompanhe o desempenho das vendas e análises de negócio"
        />
        <RelatoriosClient />
      </div>
    </>
  );
}
