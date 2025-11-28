
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import SideNavBar, { Logo } from '@/components/side-nav-bar';
import RelatoriosClient from './_components/relatorios-client';

export default async function RelatoriosPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/login');
  }

  if (session.user.role !== 'admin') {
    redirect('/vender');
  }

  const topLinks = [
    { href: '/dashboard', icon: 'dashboard', label: 'Dashboard' },
    { href: '/vender', icon: 'storefront', label: 'Vendas' },
    { href: '/estoque', icon: 'inventory_2', label: 'Estoque' },
    { href: '/equipe', icon: 'group', label: 'Equipe' },
    { href: '/relatorios', icon: 'assessment', label: 'Relatórios', isActive: true, isFilled: true },
  ];

  const bottomLinks = [
    { href: '/minha-conta', icon: 'settings', label: 'Configurações' },
    { href: '#', icon: 'help_outline', label: 'Ajuda' },
  ];

  return (
    <div className="relative flex min-h-screen w-full">
      <SideNavBar logo={<Logo />} topLinks={topLinks} bottomLinks={bottomLinks} />
      <main className="flex-1 p-6 lg:p-10 bg-background-light dark:bg-background-dark">
        <div className="w-full max-w-7xl mx-auto">
            <RelatoriosClient />
        </div>
      </main>
    </div>
  );
}
