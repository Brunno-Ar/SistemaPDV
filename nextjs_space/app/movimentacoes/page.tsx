
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { NavBar } from '@/components/nav-bar';
import MovimentacoesClient from './_components/movimentacoes-client';

export default async function MovimentacoesPage() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'admin') {
    redirect('/vender');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <MovimentacoesClient />
      </div>
    </div>
  );
}
