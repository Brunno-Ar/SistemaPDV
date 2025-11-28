
'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import PageHeading from '@/components/page-heading';

interface Usuario {
  id: string;
  email: string;
  nome: string | null;
  name: string | null;
  role: string;
  createdAt: string;
}

interface EquipeClientProps {
  companyId?: string;
}

const EmployeeCard = ({ user }: { user: Usuario }) => {
    const roleClass = user.role === 'admin' ? 'border-gerente' : 'border-operador';
    const roleTextClass = user.role === 'admin' ? 'text-gerente' : 'text-operador';
    const roleName = user.role === 'admin' ? 'Gerente' : 'Operador de Caixa';

    return (
        <div className={`flex flex-col text-center bg-card-light dark:bg-card-dark rounded-xl shadow-sm overflow-hidden border-t-4 ${roleClass} hover:-translate-y-1 transition-transform duration-300`}>
            <div className="p-6 flex flex-col items-center gap-4">
                <img className="w-24 h-24 rounded-full object-cover" alt={`Foto de perfil de ${user.name}`} src={`https://avatar.vercel.sh/${user.email}.png`} />
                <div>
                    <p className="text-text-light dark:text-text-dark text-lg font-bold leading-normal">{user.name || user.email}</p>
                    <p className={`${roleTextClass} text-sm font-medium leading-normal`}>{roleName}</p>
                </div>
            </div>
            <div className="border-t border-border-light dark:border-border-dark p-2 flex justify-center">
                <button className="text-gray-500 dark:text-gray-400 hover:text-primary dark:hover:text-primary rounded-full p-2 transition-colors">
                    <span className="material-symbols-outlined">more_vert</span>
                </button>
            </div>
        </div>
    );
};


export default function EquipeClient({ companyId }: EquipeClientProps = {}) {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    senha: '',
    nome: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('Todos');

  useEffect(() => {
    fetchUsuarios();
  }, [companyId]);

  const fetchUsuarios = async () => {
    setLoading(true);
    try {
      const url = companyId 
        ? `/api/admin/equipe?companyId=${companyId}` 
        : '/api/admin/equipe';
      const response = await fetch(url);
      if (!response.ok) throw new Error('Erro ao buscar usuários');
      const data = await response.json();
      setUsuarios(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
      setUsuarios([]);
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Não foi possível carregar a equipe',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      let url = '/api/admin/equipe';
      if (companyId) {
        url += `?companyId=${companyId}`;
      }
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Erro ao criar usuário');
      }
      toast({
        title: 'Sucesso!',
        description: 'Usuário criado com sucesso',
      });
      handleDialogChange(false);
      fetchUsuarios();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDialogChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setFormData({ email: '', senha: '', nome: '' });
    }
  };

  const filteredUsers = usuarios.filter(user => {
    const name = user.name || user.email;
    const role = user.role === 'admin' ? 'Gerente' : 'Operador de Caixa';

    const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === 'Todos' || role === filter;

    return matchesSearch && matchesFilter;
  });

  return (
    <>
      <PageHeading title="Gerenciamento de Equipe">
        <Dialog open={dialogOpen} onOpenChange={handleDialogChange}>
          <DialogTrigger asChild>
            <button className="flex min-w-[84px] cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-lg h-10 px-4 bg-primary-darker text-white text-sm font-bold leading-normal tracking-[0.015em] hover:bg-primary-darker/90 transition-colors">
              <span className="material-symbols-outlined">add</span>
              <span className="truncate">Adicionar Novo Membro</span>
            </button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[450px]">
            <DialogHeader>
              <DialogTitle>Criar Novo Membro</DialogTitle>
              <DialogDescription>
                Preencha os dados do novo membro da equipe.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome</Label>
                <Input id="nome" value={formData.nome} onChange={(e) => setFormData({ ...formData, nome: e.target.value })} placeholder="Nome completo" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="email@exemplo.com" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="senha">Senha *</Label>
                <Input id="senha" type="password" value={formData.senha} onChange={(e) => setFormData({ ...formData, senha: e.target.value })} placeholder="Senha de acesso" required />
              </div>
              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={() => handleDialogChange(false)} disabled={submitting}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={submitting} className="bg-primary-darker hover:bg-primary-darker/90">
                  {submitting ? 'Criando...' : 'Criar Membro'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeading>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1">
          <div className="flex flex-col h-12 w-full">
            <div className="flex w-full flex-1 items-stretch rounded-lg h-full bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark focus-within:ring-2 focus-within:ring-primary-darker">
              <div className="text-gray-500 dark:text-gray-400 flex items-center justify-center pl-4">
                <span className="material-symbols-outlined">search</span>
              </div>
              <input
                className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden text-text-light dark:text-text-dark focus:outline-0 focus:ring-0 border-none bg-transparent h-full placeholder:text-gray-500 dark:placeholder:text-gray-400 pl-2 text-base font-normal leading-normal"
                placeholder="Buscar por nome ou função..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>
        <div className="flex gap-2 items-center overflow-x-auto pb-2">
            {['Todos', 'Gerente', 'Operador de Caixa'].map(role => (
                 <button
                    key={role}
                    onClick={() => setFilter(role)}
                    className={`flex h-10 shrink-0 items-center justify-center gap-x-2 rounded-lg px-4 transition-colors text-sm font-medium leading-normal ${
                        filter === role
                        ? 'bg-primary-darker/20 text-primary-darker'
                        : 'bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark hover:border-primary-darker'
                    }`}
                >
                    {role}
                </button>
            ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <p>Carregando equipe...</p>
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-6">
          {filteredUsers.length > 0 ? (
            filteredUsers.map((user) => <EmployeeCard key={user.id} user={user} />)
          ) : (
            <p>Nenhum membro da equipe encontrado.</p>
          )}
        </div>
      )}
    </>
  );
}
