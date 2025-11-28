
'use client'

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import SideNavBar from '@/components/side-nav-bar';
import { useSession } from 'next-auth/react';

export default function MinhaContaPage() {
  const { data: session } = useSession();
  const [formData, setFormData] = useState({
    senhaAtual: "",
    novaSenha: "",
    confirmarNovaSenha: "",
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (formData.novaSenha !== formData.confirmarNovaSenha) {
      toast({
        title: "Erro",
        description: "A nova senha e a confirmação não coincidem",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    if (formData.novaSenha.length < 6) {
      toast({
        title: "Erro",
        description: "A nova senha deve ter pelo menos 6 caracteres",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senhaAtual: formData.senhaAtual,
          novaSenha: formData.novaSenha,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Erro ao alterar senha");
      }

      toast({
        title: "Sucesso",
        description: "Senha alterada com sucesso!",
      });

      setFormData({ senhaAtual: "", novaSenha: "", confirmarNovaSenha: "" });
    } catch (error) {
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao alterar senha",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const topLinks = [
    { href: '/dashboard', icon: 'dashboard', label: 'Dashboard' },
    { href: '/vender', icon: 'shopping_cart', label: 'Vendas' },
    { href: '/estoque', icon: 'inventory_2', label: 'Produtos' },
    { href: '/relatorios', icon: 'bar_chart', label: 'Relatórios' },
    { href: '/config', icon: 'settings', label: 'Configurações' },
  ];

  const bottomLinks = [
    { href: '/minha-conta', icon: 'account_circle', label: 'Minha Conta', isActive: true, isFilled: true },
    { href: '#', icon: 'logout', label: 'Sair' },
  ];


  return (
    <div className="relative flex min-h-screen w-full">
      <SideNavBar
        logo={
            <div className="flex items-center gap-3 px-2">
                <div className="bg-primary rounded-lg p-2 flex items-center justify-center">
                    <span className="material-symbols-outlined text-white" style={{fontSize: "24px"}}>storefront</span>
                </div>
                <h1 className="text-text-light dark:text-text-dark text-lg font-bold">VarejoMax</h1>
            </div>
        }
        topLinks={topLinks}
        bottomLinks={bottomLinks}
      />
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 md:p-8 lg:p-12">
          <div className="mx-auto max-w-4xl">
            <div className="mb-8">
              <p className="text-text-light dark:text-text-dark text-4xl font-black leading-tight tracking-[-0.033em]">Minha Conta</p>
            </div>
            <div className="rounded-xl border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-sm">
              <div className="flex flex-col gap-4 border-b border-border-light dark:border-border-dark p-6 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full h-24 w-24 shrink-0" style={{backgroundImage: `url(https://avatar.vercel.sh/${session?.user?.email}.png)`}}></div>
                  <div className="flex flex-col justify-center">
                    <p className="text-text-light dark:text-text-dark text-[22px] font-bold leading-tight tracking-[-0.015em]">{session?.user?.name}</p>
                    <p className="text-text-light/70 dark:text-text-dark/70 text-base font-normal leading-normal">{session?.user?.email}</p>
                    <p className="text-text-light/70 dark:text-text-dark/70 text-base font-normal leading-normal">Empresa Exemplo LTDA</p>
                  </div>
                </div>
                <div className="flex">
                  <div className="flex h-8 shrink-0 items-center justify-center gap-x-2 rounded-lg bg-primary/20 px-4">
                    <p className="text-primary text-sm font-medium leading-normal">{session?.user?.role}</p>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <h2 className="text-text-light dark:text-text-dark text-[22px] font-bold leading-tight tracking-[-0.015em] pb-5">Alterar Senha</h2>
                <form className="grid grid-cols-1 gap-6 md:grid-cols-2" onSubmit={handleSubmit}>
                  <div className="col-span-1 flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="senhaAtual">Senha Atual</Label>
                      <div className="relative">
                        <Input id="senhaAtual" type={showPassword ? 'text' : 'password'} value={formData.senhaAtual} onChange={(e) => setFormData({ ...formData, senhaAtual: e.target.value })} required />
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="novaSenha">Nova Senha</Label>
                      <div className="relative">
                        <Input id="novaSenha" type={showPassword ? 'text' : 'password'} value={formData.novaSenha} onChange={(e) => setFormData({ ...formData, novaSenha: e.target.value })} placeholder="Mínimo de 8 caracteres" required />
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="confirmarNovaSenha">Confirmar Nova Senha</Label>
                      <div className="relative">
                        <Input id="confirmarNovaSenha" type={showPassword ? 'text' : 'password'} value={formData.confirmarNovaSenha} onChange={(e) => setFormData({ ...formData, confirmarNovaSenha: e.target.value })} placeholder="Repita a nova senha" required />
                        <button type="button" className="absolute inset-y-0 right-0 flex items-center pr-3 text-text-light/50 dark:text-text-dark/50 hover:text-text-light dark:hover:text-text-dark" onClick={() => setShowPassword(!showPassword)}>
                          <span className="material-symbols-outlined" style={{fontSize: "20px"}}>{showPassword ? 'visibility_off' : 'visibility'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </form>
              </div>
              <div className="flex justify-end gap-3 border-t border-border-light dark:border-border-dark p-6">
                <Button variant="ghost" type="button">Cancelar</Button>
                <Button type="submit" onClick={handleSubmit} disabled={loading}>{loading ? 'Salvando...' : 'Salvar Alterações'}</Button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
