import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { Bell, Plus, UserCog, DollarSign, ShoppingBag } from "lucide-react";
import { InteractiveHoverButton } from "@/components/ui/interactive-hover-button";

export default async function MasterDashboard() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "master") {
    redirect("/vender");
  }

  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  // Buscar estatísticas gerais
  const totalEmpresas = await prisma.empresa.count();
  const empresasAtivas = await prisma.empresa.count({
    where: { status: "ATIVO" },
  });
  const totalUsuarios = await prisma.user.count();
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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  return (
    <div className="space-y-6">
      {/* TopNavBar / Header */}
      <header className="flex items-center justify-between whitespace-nowrap border-b border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 sm:px-10 py-3 rounded-xl shadow-sm">
        <div className="flex items-center gap-4">
          <h2 className="text-gray-900 dark:text-white text-lg font-bold leading-tight tracking-[-0.015em]">
            Dashboard Master
          </h2>
        </div>
        <div className="flex flex-1 justify-end gap-4">
          <InteractiveHoverButton className="w-10 min-w-10 px-0 bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-zinc-800">
            <Bell className="h-5 w-5" />
          </InteractiveHoverButton>
          <div
            className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10"
            style={{
              backgroundImage:
                'url("https://lh3.googleusercontent.com/aida-public/AB6AXuCKPbs7VLri7A91VBbdXHg4FMYnQh4XF85fRxEAe2pNGAHlBlSwGG_K65sa6L_1sKWhXuOKk0SF5AMf42MN7T35KSbHBjIjpqz_rf_FCTOIidGRuIqDftAzfGLlUemm7vCqvqljzG-3VjFABoyVZidCE4D7tqGNpiQtYzCapGccKjCcayarLl_p7h_hazQB-aJhaeioBXSFtzxlFqwYHxU8x1vZ3eoKnihMVAYX86tr-NAS6osczpOP1X6BlsHlBz3wZBUufar2YN7t")',
            }}
          ></div>
        </div>
      </header>

      {/* Stats Section */}
      <section>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Faturamento Total */}
          <div className="flex flex-col gap-2 rounded-xl p-6 border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm relative overflow-hidden">
            <div className="absolute top-4 right-4 text-green-500 opacity-20">
              <DollarSign className="h-12 w-12" />
            </div>
            <p className="text-gray-600 dark:text-gray-400 text-base font-medium leading-normal z-10">
              Faturamento Total
            </p>
            <p className="text-green-600 dark:text-green-400 tracking-light text-3xl font-bold leading-tight z-10">
              {formatCurrency(faturamentoTotal)}
            </p>
          </div>

          {/* Total Vendas */}
          <div className="flex flex-col gap-2 rounded-xl p-6 border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-gray-600 dark:text-gray-400 text-base font-medium leading-normal">
                Total de Vendas
              </p>
              <ShoppingBag className="h-5 w-5 text-blue-500" />
            </div>
            <p className="text-gray-900 dark:text-white tracking-light text-3xl font-bold leading-tight">
              {totalVendas}
            </p>
          </div>

          {/* Empresas Ativas */}
          <div className="flex flex-col gap-2 rounded-xl p-6 border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
            <p className="text-gray-600 dark:text-gray-400 text-base font-medium leading-normal">
              Empresas Ativas
            </p>
            <p className="text-gray-900 dark:text-white tracking-light text-3xl font-bold leading-tight">
              {empresasAtivas}
            </p>
          </div>

          {/* Produtos Cadastrados */}
          <div className="flex flex-col gap-2 rounded-xl p-6 border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
            <p className="text-gray-600 dark:text-gray-400 text-base font-medium leading-normal">
              Produtos Cadastrados
            </p>
            <p className="text-gray-900 dark:text-white tracking-light text-3xl font-bold leading-tight">
              {totalProdutos}
            </p>
          </div>
        </div>
      </section>

      {/* Quick Actions Section */}
      <section>
        <h3 className="text-gray-900 dark:text-white text-lg font-bold leading-tight tracking-[-0.015em] pb-2 pt-4">
          Ações Rápidas
        </h3>
        <div className="flex flex-wrap gap-4 py-3 justify-start">
          <Link href="/master/empresas">
            <InteractiveHoverButton className="bg-cta-bg text-white border-cta-bg hover:bg-cta-bg/90">
              <span className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                <span className="truncate">Adicionar Empresa</span>
              </span>
            </InteractiveHoverButton>
          </Link>
          <Link href="/master/usuarios">
            <InteractiveHoverButton className="bg-gray-200 dark:bg-zinc-800 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-zinc-800 hover:bg-gray-300 dark:hover:bg-zinc-700">
              <span className="flex items-center gap-2">
                <UserCog className="h-5 w-5" />
                <span className="truncate">Gerenciar Usuários Master</span>
              </span>
            </InteractiveHoverButton>
          </Link>
        </div>
      </section>

      {/* Recent Activity Section */}
      <section>
        <h3 className="text-gray-900 dark:text-white text-lg font-bold leading-tight tracking-[-0.015em] pb-2 pt-4">
          Empresas Recentes
        </h3>
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/50">
                <tr>
                  <th
                    className="px-6 py-3 font-medium text-gray-600 dark:text-gray-400"
                    scope="col"
                  >
                    Empresa
                  </th>
                  <th
                    className="px-6 py-3 font-medium text-gray-600 dark:text-gray-400"
                    scope="col"
                  >
                    Fat. Mês
                  </th>
                  <th
                    className="px-6 py-3 font-medium text-gray-600 dark:text-gray-400"
                    scope="col"
                  >
                    Produtos
                  </th>
                  <th
                    className="px-6 py-3 font-medium text-gray-600 dark:text-gray-400"
                    scope="col"
                  >
                    Vendas
                  </th>
                  <th
                    className="px-6 py-3 font-medium text-gray-600 dark:text-gray-400"
                    scope="col"
                  >
                    Vencimento
                  </th>
                  <th
                    className="px-6 py-3 font-medium text-gray-600 dark:text-gray-400"
                    scope="col"
                  >
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {empresasRecentes.map((empresa) => (
                  <tr
                    key={empresa.id}
                    className="border-b border-gray-200 dark:border-zinc-800 last:border-0 hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors"
                  >
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                      {empresa.nome}
                    </td>
                    <td className="px-6 py-4 font-medium text-green-600 dark:text-green-400">
                      {formatCurrency(empresa.faturamentoMensal)}
                    </td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                      {empresa.totalProdutos}
                    </td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                      {empresa.totalVendas}
                    </td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                      {empresa.vencimentoPlano
                        ? new Date(empresa.vencimentoPlano).toLocaleDateString(
                            "pt-BR"
                          )
                        : "-"}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                          empresa.status === "ATIVO"
                            ? "bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300"
                            : empresa.status === "PENDENTE"
                            ? "bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-300"
                            : "bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300"
                        }`}
                      >
                        {empresa.status === "ATIVO"
                          ? "Ativo"
                          : empresa.status === "PENDENTE"
                          ? "Pendente"
                          : "Inativo"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
