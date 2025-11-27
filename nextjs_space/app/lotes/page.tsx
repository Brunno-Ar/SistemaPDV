
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import LotesClient from './_components/lotes-client'
import { NavBar } from '@/components/nav-bar'

export default async function LotesPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  if (session.user.role !== 'admin') {
    redirect('/vender')
  }

  return (
    <div>
      <NavBar />
      <div className="container mx-auto p-6 max-w-7xl">
        <LotesClient />
      </div>
    </div>
  )
}
