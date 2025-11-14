
'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Building2, Plus, Users, Package, ShoppingCart, Trash2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Empresa {
  id: string;
  nome: string;
  createdAt: string;
  _count: {
    users: number;
    products: number;
    sales: number;
  };
}

export default function EmpresasClient() {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    nomeEmpresa: '',
    adminEmail: '',
    adminSenha: '',
    adminNome: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchEmpresas();
  }, []);

  const fetchEmpresas = async () => {
    try {
      const response = await fetch('/api/master/empresas');
      if (!response.ok) throw new Error('Erro ao buscar empresas');
      const data = await response.json();
      
      // Ensure data is an array
      if (Array.isArray(data)) {
        setEmpresas(data);
      } else {
        setEmpresas([]);
      }
    } catch (error) {
      console.error('Erro ao buscar empresas:', error);
      setEmpresas([]);
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Não foi possível carregar as empresas',
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
      const response = await fetch('/api/master/empresas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao criar empresa');
      }

      toast({
        title: 'Sucesso!',
        description: 'Empresa e admin criados com sucesso',
      });

      setDialogOpen(false);
      setFormData({
        nomeEmpresa: '',
        adminEmail: '',
        adminSenha: '',
        adminNome: '',
      });
      fetchEmpresas();
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

  const handleDelete = async (empresaId: string, empresaNome: string) => {
    try {
      const response = await fetch(`/api/master/empresas?id=${empresaId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao excluir empresa');
      }

      toast({
        title: 'Sucesso!',
        description: `Empresa "${empresaNome}" excluída com sucesso`,
      });

      fetchEmpresas();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-600">Carregando empresas...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Empresas</h1>
          <p className="text-gray-600 mt-1">Gerenciar todas as empresas do sistema</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Nova Empresa
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Criar Nova Empresa</DialogTitle>
              <DialogDescription>
                Preencha os dados da empresa e do primeiro administrador
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="nomeEmpresa">Nome da Empresa *</Label>
                <Input
                  id="nomeEmpresa"
                  value={formData.nomeEmpresa}
                  onChange={(e) =>
                    setFormData({ ...formData, nomeEmpresa: e.target.value })
                  }
                  placeholder="Ex: Loja do João"
                  required
                />
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Dados do Administrador</h4>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="adminNome">Nome</Label>
                    <Input
                      id="adminNome"
                      value={formData.adminNome}
                      onChange={(e) =>
                        setFormData({ ...formData, adminNome: e.target.value })
                      }
                      placeholder="Nome do administrador"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="adminEmail">Email *</Label>
                    <Input
                      id="adminEmail"
                      type="email"
                      value={formData.adminEmail}
                      onChange={(e) =>
                        setFormData({ ...formData, adminEmail: e.target.value })
                      }
                      placeholder="admin@email.com"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="adminSenha">Senha *</Label>
                    <Input
                      id="adminSenha"
                      type="password"
                      value={formData.adminSenha}
                      onChange={(e) =>
                        setFormData({ ...formData, adminSenha: e.target.value })
                      }
                      placeholder="Senha do administrador"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  disabled={submitting}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={submitting} className="bg-blue-600 hover:bg-blue-700">
                  {submitting ? 'Criando...' : 'Criar Empresa'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {empresas.map((empresa) => (
          <Card key={empresa.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Building2 className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{empresa.nome}</CardTitle>
                    <CardDescription className="text-xs">
                      Criada em {new Date(empresa.createdAt).toLocaleDateString('pt-BR')}
                    </CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-2 text-gray-600">
                      <Users className="h-4 w-4" />
                      <span>Usuários</span>
                    </div>
                    <span className="font-medium">{empresa._count.users}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-2 text-gray-600">
                      <Package className="h-4 w-4" />
                      <span>Produtos</span>
                    </div>
                    <span className="font-medium">{empresa._count.products}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-2 text-gray-600">
                      <ShoppingCart className="h-4 w-4" />
                      <span>Vendas</span>
                    </div>
                    <span className="font-medium">{empresa._count.sales}</span>
                  </div>
                </div>
                <div className="pt-2 border-t">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm" className="w-full">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Excluir Empresa
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem certeza que deseja excluir a empresa <strong>{empresa.nome}</strong>?
                          <br />
                          <br />
                          Esta ação irá remover:
                          <ul className="list-disc list-inside mt-2 space-y-1">
                            <li>{empresa._count.users} usuário(s)</li>
                            <li>{empresa._count.products} produto(s)</li>
                            <li>{empresa._count.sales} venda(s)</li>
                            <li>Todas as movimentações de estoque</li>
                          </ul>
                          <br />
                          <span className="text-red-600 font-medium">Esta ação não pode ser desfeita.</span>
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(empresa.id, empresa.nome)}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Sim, Excluir
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {empresas.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nenhuma empresa cadastrada
            </h3>
            <p className="text-gray-600 text-center mb-4">
              Comece criando sua primeira empresa clicando no botão acima
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
