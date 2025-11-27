
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function HomePage() {
  const session = await getServerSession(authOptions)

  if (session?.user) {
    // Redirecionar baseado no role
    if (session.user.role === 'master') {
      redirect('/master')
    } else if (session.user.role === 'admin') {
      redirect('/admin')
    } else {
      redirect('/vender')
    }
  } else {
    redirect('/login')
  }
}
