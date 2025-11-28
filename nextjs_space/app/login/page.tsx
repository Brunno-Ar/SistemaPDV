
'use client'

import { useState, useEffect } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showInactivityMessage, setShowInactivityMessage] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const reason = searchParams?.get('reason')
    if (reason === 'inactivity') {
      setShowInactivityMessage(true)
      setTimeout(() => setShowInactivityMessage(false), 10000)
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false
      })

      if (result?.error) {
        setError('Email ou senha inválidos')
      } else {
        const currentTime = Date.now().toString()
        sessionStorage.setItem('pdv_tab_session_id', currentTime)
        localStorage.setItem('pdv_browser_session_id', currentTime)
        
        const response = await fetch('/api/auth/session')
        const session = await response.json()
        
        if (session?.user?.role === 'master') {
          router.push('/master')
        } else {
          router.push('/vender')
        }
      }
    } catch (error) {
      setError('Erro ao fazer login')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden">
      {showInactivityMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 w-full max-w-lg z-50 px-4">
            <div className="flex items-start gap-4 rounded-lg border border-alert-warning-border bg-alert-warning-bg p-4 shadow-lg dark:bg-dark-alert-warning-bg dark:border-dark-alert-warning-border">
                <div className="text-alert-warning-text dark:text-dark-alert-warning-text pt-0.5">
                    <span className="material-symbols-outlined">warning</span>
                </div>
                <div className="flex-1">
                    <strong className="block font-medium text-alert-warning-text dark:text-dark-alert-warning-text">Sua sessão expirou</strong>
                    <p className="mt-1 text-sm text-alert-warning-text dark:text-dark-alert-warning-text">
                        Por segurança, você foi desconectado após um período de inatividade. Por favor, faça o login novamente.
                    </p>
                </div>
            </div>
        </div>
      )}

      <div className="flex h-full min-h-screen grow flex-col">
        <div className="flex flex-1">
          <div className="grid w-full grid-cols-1 md:grid-cols-5">
            <div className="relative hidden md:flex col-span-3 flex-col items-center justify-center bg-primary p-12 text-white overflow-hidden">
              <div className="absolute inset-0 z-0 bg-gradient-to-br from-primary to-secondary opacity-90"></div>
              <div className="absolute bottom-0 left-0 w-full h-2/3 bg-tertiary rounded-t-[4rem] transform skew-y-[-5deg] origin-bottom-left"></div>
              <div className="absolute bottom-0 right-0 w-3/4 h-1/2 bg-secondary rounded-tl-[6rem] transform skew-y-[5deg] origin-bottom-right opacity-80"></div>
              <div className="absolute bottom-1/4 left-1/4 w-40 h-40 bg-white rounded-full flex items-center justify-center shadow-lg z-10">
                <span className="material-symbols-outlined text-brand text-9xl">storefront</span>
              </div>
              <div className="absolute top-1/4 right-1/4 w-24 h-24 bg-tertiary rounded-full shadow-md z-10"></div>
              <div className="absolute bottom-1/3 left-1/2 w-32 h-32 bg-primary rounded-full shadow-md z-10"></div>
              <div className="absolute top-1/2 left-1/3 w-20 h-20 bg-secondary rounded-full shadow-md z-10"></div>
              <div className="relative z-10 flex flex-col items-center justify-center text-center max-w-sm">
                <h2 className="text-6xl font-display font-bold tracking-tight mb-4 drop-shadow-lg">FlowPDV</h2>
                <p className="text-2xl font-display mt-2 opacity-90 drop-shadow-md">Sua loja, com um toque mágico.</p>
              </div>
            </div>

            <div className="flex col-span-1 md:col-span-2 flex-col items-center justify-center bg-background-light dark:bg-background-dark p-6 sm:p-12">
              <div className="w-full max-w-md">
                <div className="flex flex-col items-center justify-center text-center md:hidden mb-10">
                  <span className="material-symbols-outlined text-6xl mb-2 text-primary dark:text-primary">storefront</span>
                  <h2 className="text-4xl font-display font-bold tracking-tight text-gray-800 dark:text-gray-100">FlowPDV</h2>
                  <p className="text-lg font-display mt-1 text-gray-600 dark:text-gray-300">Sua loja, com um toque mágico.</p>
                </div>
                <h1 className="text-gray-800 dark:text-gray-100 tracking-light text-[38px] font-display font-bold leading-tight text-center pb-2">Entre para o FlowPDV!</h1>
                <p className="text-gray-600 dark:text-gray-400 text-base font-sans font-normal leading-normal pb-6 text-center">Faça seu login para gerenciar sua loja com magia.</p>
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                  <Label className="flex flex-col flex-1">
                    <p className="text-gray-800 dark:text-gray-200 text-sm font-sans font-medium leading-normal pb-2">E-mail</p>
                    <div className="relative flex items-center">
                      <span className="material-symbols-outlined absolute left-4 text-gray-400 dark:text-gray-500 pointer-events-none">mail</span>
                      <Input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="seuemail@exemplo.com" className="h-14 pl-12 pr-4" required />
                    </div>
                  </Label>
                  <Label className="flex flex-col flex-1">
                    <div className="flex justify-between items-baseline pb-2">
                      <p className="text-gray-800 dark:text-gray-200 text-sm font-sans font-medium leading-normal">Senha</p>
                      <a className="text-primary hover:underline text-sm font-sans font-normal leading-normal" href="#">Esqueceu sua senha mágica?</a>
                    </div>
                    <div className="relative flex items-center">
                      <span className="material-symbols-outlined absolute left-4 text-gray-400 dark:text-gray-500 pointer-events-none">lock</span>
                      <Input value={password} onChange={e => setPassword(e.target.value)} type={showPassword ? 'text' : 'password'} placeholder="••••••••" className="h-14 pl-12 pr-12" required/>
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
                        <span className="material-symbols-outlined">{showPassword ? 'visibility_off' : 'visibility'}</span>
                      </button>
                    </div>
                  </Label>
                  {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                  <div className="pt-4">
                    <Button type="submit" className="w-full h-14 text-lg font-bold" disabled={loading}>
                      {loading ? 'Entrando...' : 'Entrar'}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
