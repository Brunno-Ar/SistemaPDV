
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { NavBar } from '@/components/nav-bar'
import RelatoriosClient from './_components/relatorios-client'

export default async function RelatoriosPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    redirect('/login')
  }

  // Verificar se é Admin
  if (session.user.role !== 'admin') {
    redirect('/vender')
  }

  return (
    <>
      <NavBar />
      <div className="max-w-7xl mx-auto p-4">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Relatórios e Dashboard</h1>
          <p className="text-gray-600">Acompanhe o desempenho das vendas e análises de negócio</p>
        </div>
        <RelatoriosClient />
      </div>
    </>
  )
}
