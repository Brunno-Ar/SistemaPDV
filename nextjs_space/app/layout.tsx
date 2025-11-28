
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers'
import { InactivityMonitor } from '@/components/inactivity-monitor'

const inter = Inter({ subsets: ['latin'] })

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXTAUTH_URL || 'http://localhost:3000'),
  title: 'Sistema de Gestão de Varejo',
  description: 'A Gestão do Seu Varejo, Simplificada e Inteligente',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
  },
  openGraph: {
    title: 'Sistema de Gestão de Varejo',
    description: 'A Gestão do Seu Varejo, Simplificada e Inteligente',
    images: ['/og-image.png'],
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        <Providers>
          <InactivityMonitor />
          {children}
        </Providers>
      </body>
    </html>
  )
}
