
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import { toast } from '@/hooks/use-toast'

export default function SignupPage() {
  const [formData, setFormData] = useState({
    nomeEmpresa: '',
    cnpj: '',
    nomeCompleto: '',
    email: '',
    senha: '',
    confirmarSenha: '',
  });
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.senha !== formData.confirmarSenha) {
        toast({ title: "Erro", description: "As senhas não coincidem.", variant: "destructive" });
        return;
    }
    setLoading(true)

    try {
      const { confirmarSenha, ...payload } = formData;
      const signupResponse = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const signupData = await signupResponse.json()

      if (!signupResponse.ok) {
        throw new Error(signupData.error || 'Erro ao criar conta');
      }

      toast({ title: "Sucesso!", description: signupData.message });
      
      setTimeout(() => {
        router.push('/login')
      }, 3000)

    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  }

  return (
    <div className="relative flex min-h-screen w-full flex-col bg-background-light dark:bg-background-dark">
      <div className="flex flex-1 justify-center py-8 px-4 sm:py-12 md:py-16">
        <div className="flex flex-col w-full max-w-[960px] flex-1">
          <header className="flex items-center justify-center whitespace-nowrap px-4 py-3 sm:px-10">
            <div className="flex items-center gap-4 text-text-light dark:text-text-dark">
                <div className="text-primary size-7">
                    <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg"><g clipPath="url(#clip0_6_543)"><path d="M42.1739 20.1739L27.8261 5.82609C29.1366 7.13663 28.3989 10.1876 26.2002 13.7654C24.8538 15.9564 22.9595 18.3449 20.6522 20.6522C18.3449 22.9595 15.9564 24.8538 13.7654 26.2002C10.1876 28.3989 7.13663 29.1366 5.82609 27.8261L20.1739 42.1739C21.4845 43.4845 24.5355 42.7467 28.1133 40.548C30.3042 39.2016 32.6927 37.3073 35 35C37.3073 32.6927 39.2016 30.3042 40.548 28.1133C42.7467 24.5355 43.4845 21.4845 42.1739 20.1739Z" fill="currentColor"></path><path clipRule="evenodd" d="M7.24189 26.4066C7.31369 26.4411 7.64204 26.5637 8.52504 26.3738C9.59462 26.1438 11.0343 25.5311 12.7183 24.4963C14.7583 23.2426 17.0256 21.4503 19.238 19.238C21.4503 17.0256 23.2426 14.7583 24.4963 12.7183C25.5311 11.0343 26.1438 9.59463 26.3738 8.52504C26.5637 7.64204 26.4411 7.31369 26.4066 7.24189C26.345 7.21246 26.143 7.14535 25.6664 7.1918C24.9745 7.25925 23.9954 7.5498 22.7699 8.14278C20.3369 9.32007 17.3369 11.4915 14.4142 14.4142C11.4915 17.3369 9.32007 20.3369 8.14278 22.7699C7.5498 23.9954 7.25925 24.9745 7.1918 25.6664C7.14534 26.143 7.21246 26.345 7.24189 26.4066ZM29.9001 10.7285C29.4519 12.0322 28.7617 13.4172 27.9042 14.8126C26.465 17.1544 24.4686 19.6641 22.0664 22.0664C19.6641 24.4686 17.1544 26.465 14.8126 27.9042C13.4172 28.7617 12.0322 29.4519 10.7285 29.9001L21.5754 40.747C21.6001 40.7606 21.8995 40.931 22.8729 40.7217C23.9424 40.4916 25.3821 39.879 27.0661 38.8441C29.1062 37.5904 31.3734 35.7982 33.5858 33.5858C35.7982 31.3734 37.5904 29.1062 38.8441 27.0661C39.879 25.3821 40.4916 23.9425 40.7216 22.8729C40.931 21.8995 40.7606 21.6001 40.747 21.5754L29.9001 10.7285ZM29.2403 4.41187L43.5881 18.7597C44.9757 20.1473 44.9743 22.1235 44.6322 23.7139C44.2714 25.3919 43.4158 27.2666 42.252 29.1604C40.8128 31.5022 38.8165 34.012 36.4142 36.4142C34.012 38.8165 31.5022 40.8128 29.1604 42.252C27.2666 43.4158 25.3919 44.2714 23.7139 44.6322C22.1235 44.9743 20.1473 44.9757 18.7597 43.5881L4.41187 29.2403C3.29027 28.1187 3.08209 26.5973 3.21067 25.2783C3.34099 23.9415 3.8369 22.4852 4.54214 21.0277C5.96129 18.0948 8.43335 14.7382 11.5858 11.5858C14.7382 8.43335 18.0948 5.9613 21.0277 4.54214C22.4852 3.8369 23.9415 3.34099 25.2783 3.21067C26.5973 3.08209 28.1187 3.29028 29.2403 4.41187Z" fill="currentColor" fillRule="evenodd"></path></g><defs><clipPath id="clip0_6_543"><rect fill="white" height="48" width="48"></rect></clipPath></defs></svg>
                </div>
                <h2 className="text-text-light dark:text-text-dark text-xl font-bold leading-tight tracking-[-0.015em]">Gestão de Varejo</h2>
            </div>
          </header>
          <main className="flex-1 w-full max-w-2xl mx-auto">
            <div className="bg-card-light dark:bg-card-dark rounded-xl shadow-lg border border-border-light dark:border-border-dark p-6 sm:p-8 md:p-10">
              <div className="flex flex-wrap justify-between gap-3 mb-2">
                <p className="text-text-light dark:text-text-dark text-3xl sm:text-4xl font-black leading-tight tracking-[-0.033em] min-w-72">Crie sua Conta e Cadastre sua Empresa</p>
              </div>
              <p className="text-subtle-light dark:text-subtle-dark text-base font-normal leading-normal pb-6 pt-1">
                Preencha os dados abaixo para criar a conta da sua empresa e o primeiro usuário administrador. Seu cadastro ficará pendente até nossa aprovação.
              </p>
              <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                <div className="border-t border-border-light dark:border-border-dark pt-6">
                  <h3 className="text-text-light dark:text-text-dark text-lg font-bold leading-tight tracking-[-0.015em] pb-2">Dados da Empresa</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
                    <Label className="flex flex-col min-w-40 flex-1">
                        <p className="pb-2">Nome da Empresa</p>
                        <Input id="nomeEmpresa" value={formData.nomeEmpresa} onChange={handleChange} placeholder="Digite o nome da sua empresa" required/>
                    </Label>
                    <Label className="flex flex-col min-w-40 flex-1">
                        <p className="pb-2">CNPJ</p>
                        <Input id="cnpj" value={formData.cnpj} onChange={handleChange} placeholder="00.000.000/0000-00" required/>
                    </Label>
                  </div>
                </div>
                <div className="border-t border-border-light dark:border-border-dark pt-6">
                  <h3 className="text-text-light dark:text-text-dark text-lg font-bold leading-tight tracking-[-0.015em] pb-2">Usuário Administrador</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
                    <Label className="flex flex-col min-w-40 flex-1 sm:col-span-2">
                        <p className="pb-2">Nome Completo</p>
                        <Input id="nomeCompleto" value={formData.nomeCompleto} onChange={handleChange} placeholder="Digite seu nome completo" required/>
                    </Label>
                    <Label className="flex flex-col min-w-40 flex-1 sm:col-span-2">
                        <p className="pb-2">E-mail</p>
                        <Input id="email" value={formData.email} onChange={handleChange} type="email" placeholder="seuemail@exemplo.com" required/>
                    </Label>
                    <Label className="flex flex-col min-w-40 flex-1 relative">
                        <p className="pb-2">Senha</p>
                        <Input id="senha" value={formData.senha} onChange={handleChange} type={showPassword ? 'text' : 'password'} placeholder="Crie uma senha forte" required/>
                        <button type="button" aria-label="Mostrar senha" className="absolute right-3 top-[46px] text-subtle-light dark:text-subtle-dark" onClick={() => setShowPassword(!showPassword)}>
                            <span className="material-symbols-outlined">{showPassword ? 'visibility_off' : 'visibility'}</span>
                        </button>
                        <p className="text-xs text-subtle-light dark:text-subtle-dark mt-1">Mínimo 8 caracteres, com letras e números.</p>
                    </Label>
                    <Label className="flex flex-col min-w-40 flex-1">
                        <p className="pb-2">Confirmar Senha</p>
                        <Input id="confirmarSenha" value={formData.confirmarSenha} onChange={handleChange} type="password" placeholder="Repita sua senha" required/>
                    </Label>
                  </div>
                </div>
                <div className="flex items-start pt-4">
                  <input id="terms" type="checkbox" className="form-checkbox h-5 w-5 rounded border-border-light dark:border-border-dark text-primary focus:ring-primary/50 bg-background-light dark:bg-background-dark mt-0.5" required/>
                  <label htmlFor="terms" className="ml-3 text-sm">
                    <span className="text-text-light dark:text-text-dark">Eu li e aceito os</span>
                    <a href="#" className="font-medium text-primary hover:underline">Termos de Serviço</a>
                    <span className="text-text-light dark:text-text-dark"> e a </span>
                    <a href="#" className="font-medium text-primary hover:underline">Política de Privacidade</a>.
                  </label>
                </div>
                <Button type="submit" className="h-12 text-base font-bold" disabled={loading}>
                  {loading ? 'Finalizando...' : 'Finalizar Cadastro'}
                </Button>
              </form>
              <p className="text-center text-subtle-light dark:text-subtle-dark text-sm mt-8">
                Já tem uma conta? <Link href="/login" className="font-medium text-primary hover:underline">Faça login</Link>
              </p>
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
