import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { Plus, UserCog } from "lucide-react";
import { InteractiveHoverButton } from "@/components/ui/interactive-hover-button";
import { PageHeader } from "@/components/ui/page-header";
import { MasterStats } from "./_components/master-stats";
import {
  RecentCompaniesTable,
  EmpresaRecente,
} from "./_components/recent-companies-table";
import { SyncPanel } from "./_components/sync-panel";

// Preço base do plano para cálculo de MRR estimado
const PLAN_PRICE = parseFloat(process.env.NEXT_PUBLIC_PLAN_PRICE || "49.90");

export default async function MasterDashboard() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "master") {
    redirect("/vender");
  }

  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  // 1. Estatísticas de Empresas
  const empresasAtivas = await prisma.empresa.count({
    where: { status: "ATIVO" },
  });

  const empresasPausadas = await prisma.empresa.count({
    where: { status: "PAUSADO" },
  });

  // 2. Faturamento Total (Acumulado de todas as vendas do sistema)
  const faturamentoData = await prisma.sale.aggregate({
    _sum: { valorTotal: true },
  });
  const faturamentoTotal = Number(faturamentoData._sum.valorTotal || 0);

  // 3. Cálculo de MRR (Estimado: Empresas Ativas * Valor do Plano)
  // Idealmente somaria o valor individual de cada assinatura ativa no Asaas,
  // mas para performance usamos a estimativa baseada no plano padrão.
  const mrr = empresasAtivas * PLAN_PRICE;

  // 4. Buscar empresas recentes
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

  const empresasRecentes: EmpresaRecente[] = empresasRecentesRaw.map(
    (empresa) => ({
      id: empresa.id,
      nome: empresa.nome,
      status: empresa.status as any, // Cast para o tipo da interface
      vencimentoPlano: empresa.vencimentoPlano,
      faturamentoMensal: empresa.sales.reduce(
        (acc, curr) => acc + Number(curr.valorTotal),
        0
      ),
      totalProdutos: empresa._count.products,
      totalVendas: empresa._count.sales,
    })
  );

  // 5. Buscar inadimplentes (PAUSADO) para destaque
  const empresasInadimplentesRaw = await prisma.empresa.findMany({
    where: { status: "PAUSADO" },
    take: 5,
    orderBy: { vencimentoPlano: "asc" }, // Mais antigas primeiro (prioridade)
    include: {
      _count: {
        select: { products: true, sales: true },
      },
      sales: {
        where: {
          createdAt: {
            gte: firstDayOfMonth,
            lte: lastDayOfMonth,
          },
        },
        select: { valorTotal: true },
      },
    },
  });

  const empresasInadimplentes: EmpresaRecente[] = empresasInadimplentesRaw.map(
    (empresa) => ({
      id: empresa.id,
      nome: empresa.nome,
      status: empresa.status as any,
      vencimentoPlano: empresa.vencimentoPlano,
      faturamentoMensal: empresa.sales.reduce(
        (acc, curr) => acc + Number(curr.valorTotal),
        0
      ),
      totalProdutos: empresa._count.products,
      totalVendas: empresa._count.sales,
    })
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard Master"
        description="Visão geral do sistema e métricas SaaS"
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

      {/* Stats Section with MRR and Inadimplência */}
      <MasterStats
        faturamentoTotal={faturamentoTotal}
        empresasAtivas={empresasAtivas}
        mrr={mrr}
        inadimplentesCount={empresasPausadas}
      />

      {/* Sync Panel Section (Legacy/Maintenance) */}
      <section>
        <SyncPanel />
      </section>

      {/* Seção de Inadimplência (Só aparece se houver) */}
      {empresasInadimplentes.length > 0 && (
        <section className="border rounded-xl p-4 border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-900/30">
          <h3 className="text-red-700 dark:text-red-400 text-lg font-bold leading-tight tracking-[-0.015em] pb-4 flex items-center gap-2">
            ⚠️ Empresas Inadimplentes (Pausadas)
          </h3>
          <RecentCompaniesTable empresas={empresasInadimplentes} />
        </section>
      )}

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
