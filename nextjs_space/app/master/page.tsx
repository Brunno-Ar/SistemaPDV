import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { Plus, UserCog } from "lucide-react";
import { InteractiveHoverButton } from "@/components/ui/interactive-hover-button";
import { PageHeader } from "@/components/ui/page-header";
import { MasterStats } from "./_components/master-stats";
import { RecentCompaniesTable } from "./_components/recent-companies-table";

export default async function MasterDashboard() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "master") {
    redirect("/vender");
  }

  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  // Buscar estatísticas gerais
  const empresasAtivas = await prisma.empresa.count({
    where: { status: "ATIVO" },
  });
  const totalProdutos = await prisma.product.count();

  // Novas Métricas
  const totalVendas = await prisma.sale.count();

  // Faturamento Total (Desde sempre)
  const faturamentoData = await prisma.sale.aggregate({
    _sum: { valorTotal: true },
  });
  const faturamentoTotal = Number(faturamentoData._sum.valorTotal || 0);

  // Buscar empresas recentes com métricas
  const empresasRecentesRaw = await prisma.empresa.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: {
          products: true,
          sales: true,
        },
      },
      sales: {
        where: {
          createdAt: {
            gte: firstDayOfMonth,
            lte: lastDayOfMonth,
          },
        },
        select: {
          valorTotal: true,
        },
      },
    },
  });

  const empresasRecentes = empresasRecentesRaw.map((empresa) => ({
    ...empresa,
    faturamentoMensal: empresa.sales.reduce(
      (acc, curr) => acc + Number(curr.valorTotal),
      0
    ),
    totalProdutos: empresa._count.products,
    totalVendas: empresa._count.sales,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard Master"
        description="Visão geral do sistema"
        actions={
          <div className="flex gap-2">
            <Link href="/master/empresas">
              <InteractiveHoverButton className="bg-cta-bg text-white border-cta-bg hover:bg-cta-bg/90">
                <span className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  <span className="truncate">Adicionar Empresa</span>
                </span>
              </InteractiveHoverButton>
            </Link>
            <Link href="/master/usuarios">
              <InteractiveHoverButton className="bg-gray-200 dark:bg-zinc-800 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-zinc-800 hover:bg-gray-300 dark:hover:bg-zinc-700">
                <span className="flex items-center gap-2">
                  <UserCog className="h-4 w-4" />
                  <span className="truncate">Gerenciar Usuários</span>
                </span>
              </InteractiveHoverButton>
            </Link>
          </div>
        }
      />

      {/* Stats Section */}
      <MasterStats
        faturamentoTotal={faturamentoTotal}
        totalVendas={totalVendas}
        empresasAtivas={empresasAtivas}
        totalProdutos={totalProdutos}
      />

      {/* Recent Activity Section */}
      <section>
        <h3 className="text-gray-900 dark:text-white text-lg font-bold leading-tight tracking-[-0.015em] pb-2 pt-4">
          Empresas Recentes
        </h3>
        <RecentCompaniesTable empresas={empresasRecentes} />
      </section>
    </div>
  );
}
