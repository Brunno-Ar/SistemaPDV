
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import DashboardClient from './_components/dashboard-client';
import SideNavBar from '@/components/side-nav-bar';

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/login');
  }

  if (session.user.role === 'master') {
    redirect('/master');
  }

  const topLinks = [
    { href: '/dashboard', icon: 'dashboard', label: 'Dashboard', isActive: true, isFilled: true },
    { href: '/vender', icon: 'shopping_cart', label: 'Vendas' },
    { href: '/estoque', icon: 'inventory_2', label: 'Estoque' },
    { href: '/relatorios', icon: 'bar_chart', label: 'Relatórios' },
  ];

  const bottomLinks = [
    { href: '/minha-conta', icon: 'settings', label: 'Configurações' }
  ];

  return (
    <div className="relative flex h-auto min-h-screen w-full">
      <SideNavBar
         logo={
            <div className="flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-primary text-3xl">store</span>
                <h2 className="text-text-light dark:text-text-dark text-xl font-bold tracking-tight">RetailFlow</h2>
            </div>
         }
        topLinks={topLinks}
        bottomLinks={bottomLinks}
      />
      <div className="flex-1 flex flex-col">
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
            <div className="mx-auto max-w-7xl">
                <DashboardClient />
            </div>
        </main>
        <footer className="text-center p-4 text-xs text-text-muted-light dark:text-text-muted-dark border-t border-border-light dark:border-border-dark mt-8">
            RetailFlow v1.0.0 | © 2024. Todos os direitos reservados.
        </footer>
      </div>
    </div>
  );
}
