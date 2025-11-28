
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Building2, Users, Package, DollarSign } from "lucide-react";
import { prisma } from "@/lib/db";
import SideNavBar from "@/components/side-nav-bar";

export default async function MasterDashboard() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "master") {
    redirect("/vender");
  }

  // Fetch general statistics
  const totalEmpresas = await prisma.empresa.count();
  const totalUsuarios = await prisma.user.count();
  const totalProdutos = await prisma.product.count();
  const totalMasters = await prisma.user.count({ where: { role: 'master' }});

  const recentCompanies = await prisma.empresa.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
  });

  const topLinks = [
    { href: '/master', icon: 'dashboard', label: 'Painel', isActive: true, isFilled: true },
    { href: '/master/empresas', icon: 'store', label: 'Empresas' },
    { href: '/master/usuarios', icon: 'group', label: 'Usuários' },
    { href: '/master/config', icon: 'settings', label: 'Configurações' },
  ];

  const bottomLinks = [
    { href: '/login', icon: 'logout', label: 'Sair' },
  ];

  const stats = [
    { title: 'Empresas Ativas', value: totalEmpresas },
    { title: 'Total de Usuários', value: totalUsuarios },
    { title: 'Produtos Cadastrados', value: totalProdutos },
    { title: 'Administradores Master', value: totalMasters },
  ];

  return (
    <div className="flex h-screen w-full">
      <SideNavBar
        logo={
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10" style={{backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuDgDC22ahc2Veuu4PBkoWF8n3dEH-5GMFiZTNO0_5iep6z3znCyI639sAb0PPQV7xmy6hcyLS4qZ2rExITDWhpd7F_lWnVfoz5xD2Qz09Ao550tSnNEMwIhUMoa6w9HC45OTOo-00xuYm5FaSZcf8RAntiGZ_O1fmhWLQbzHP-z4cNmGoI-KCLzwfsiFE1ixSzXF9aKzHd8zquFa3jgQH8hja6as_QBxC8ZQjTarHENW2_p0mVkbzBDhZnaMx8dkBk1pz3aI4V2Sp1g")'}}></div>
            <div className="flex flex-col">
              <h1 className="text-slate-900 dark:text-white text-base font-medium leading-normal">RetailSystem</h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-normal leading-normal">Plataforma de Gestão</p>
            </div>
          </div>
        }
        topLinks={topLinks}
        bottomLinks={bottomLinks}
      />
      <main className="flex-1 overflow-y-auto">
        <header className="flex items-center justify-between whitespace-nowrap border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-background-dark px-10 py-3 sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <h2 className="text-slate-900 dark:text-white text-lg font-bold leading-tight tracking-[-0.015em]">Painel Master</h2>
          </div>
          <div className="flex flex-1 justify-end gap-4">
            <button className="flex max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg size-10 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300">
              <span className="material-symbols-outlined">notifications</span>
            </button>
            <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10" style={{backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuCKPbs7VLri7A91VBbdXHg4FMYnQh4XF85fRxEAe2pNGAHlBlSwGG_K65sa6L_1sKWhXuOKk0SF5AMf42MN7T35KSbHBjIjpqz_rf_FCTOIidGRuIqDftAzfGLlUemm7vCqvqljzG-3VjFABoyVZidCE4D7tqGNpiQtYzCapGccKjCcayarLl_p7h_hazQB-aJhaeioBXSFtzxlFqwYHxU8x1vZ3eoKnihMVAYX86tr-NAS6osczpOP1X6BlsHlBz3wZBUufar2YN7t")'}}></div>
          </div>
        </header>
        <div className="p-10">
          <section>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {stats.map(stat => (
                <div key={stat.title} className="flex flex-col gap-2 rounded-xl p-6 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                  <p className="text-slate-600 dark:text-slate-400 text-base font-medium leading-normal">{stat.title}</p>
                  <p className="text-slate-900 dark:text-white tracking-light text-3xl font-bold leading-tight">{stat.value}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-10">
            <h3 className="text-slate-900 dark:text-white text-lg font-bold leading-tight tracking-[-0.015em] pb-2 pt-4">Ações Rápidas</h3>
            <div className="flex gap-4 py-3 justify-start">
              <Link href="/master/empresas/nova">
                <Button>
                  <span className="material-symbols-outlined" style={{fontSize: "20px"}}>add</span>
                  <span className="truncate ml-2">Adicionar Empresa</span>
                </Button>
              </Link>
              <Link href="/master/usuarios">
                 <Button variant="secondary">
                  <span className="material-symbols-outlined" style={{fontSize: "20px"}}>manage_accounts</span>
                  <span className="truncate ml-2">Gerenciar Usuários Master</span>
                </Button>
              </Link>
            </div>
          </section>

          <section className="mt-10">
            <h3 className="text-slate-900 dark:text-white text-lg font-bold leading-tight tracking-[-0.015em] pb-2 pt-4">Atividade Recente</h3>
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                    <tr>
                      <th className="px-6 py-3 font-medium text-slate-600 dark:text-slate-400" scope="col">Empresa</th>
                      <th className="px-6 py-3 font-medium text-slate-600 dark:text-slate-400" scope="col">Plano</th>
                      <th className="px-6 py-3 font-medium text-slate-600 dark:text-slate-400" scope="col">Data de Cadastro</th>
                      <th className="px-6 py-3 font-medium text-slate-600 dark:text-slate-400" scope="col">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentCompanies.map(company => (
                       <tr key={company.id} className="border-b border-slate-200 dark:border-slate-800">
                        <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">{company.name}</td>
                        <td className="px-6 py-4">{company.plan || 'N/A'}</td>
                        <td className="px-6 py-4">{new Date(company.createdAt).toLocaleDateString()}</td>
                        <td className="px-6 py-4">
                           <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                            company.status === 'ATIVO' ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300' :
                            company.status === 'PENDENTE' ? 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-300' :
                            'bg-gray-100 dark:bg-gray-900/50 text-gray-700 dark:text-gray-300'
                           }`}>{company.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
