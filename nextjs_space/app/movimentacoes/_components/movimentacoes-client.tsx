
'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Plus, ArrowRightLeft, Calendar, User, Package } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Product {
  id: string;
  nome: string;
  sku: string;
  estoqueAtual: number;
}

interface Movimentacao {
  id: string;
  tipo: string;
  quantidade: number;
  motivo: string | null;
  dataMovimentacao: string;
  produto: {
    nome: string;
    sku: string;
  };
  usuario: {
    nome: string | null;
    name: string | null;
    email: string;
  };
}

export default function MovimentacoesClient() {
  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([]);
  const [produtos, setProdutos] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    produtoId: '',
    tipo: '',
    quantidade: '',
    motivo: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchMovimentacoes();
    fetchProdutos();
  }, []);

  const fetchMovimentacoes = async () => {
    try {
      const response = await fetch('/api/admin/movimentacoes');
      if (!response.ok) throw new Error('Erro ao buscar movimentações');
      const data = await response.json();
      
      // Ensure data is an array
      if (Array.isArray(data)) {
        setMovimentacoes(data);
      } else {
        setMovimentacoes([]);
      }
    } catch (error) {
      console.error('Erro ao buscar movimentações:', error);
      setMovimentacoes([]);
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Não foi possível carregar as movimentações',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchProdutos = async () => {
    try {
      const response = await fetch('/api/admin/products');
      if (!response.ok) throw new Error('Erro ao buscar produtos');
      const data = await response.json();
      
      // Ensure data is an array
      if (Array.isArray(data)) {
        setProdutos(data);
      } else {
        setProdutos([]);
      }
    } catch (error) {
      console.error('Erro ao buscar produtos:', error);
      setProdutos([]);
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Não foi possível carregar os produtos',
        variant: 'destructive',
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch('/api/admin/movimentacoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          produtoId: formData.produtoId,
          tipo: formData.tipo,
          quantidade: parseInt(formData.quantidade),
          motivo: formData.motivo || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao criar movimentação');
      }

      toast({
        title: 'Sucesso!',
        description: 'Movimentação registrada com sucesso',
      });

      setDialogOpen(false);
      setFormData({
        produtoId: '',
        tipo: '',
        quantidade: '',
        motivo: '',
      });
      fetchMovimentacoes();
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

  const getTipoLabel = (tipo: string) => {
    const tipos: Record<string, string> = {
      ENTRADA: 'Entrada',
      AJUSTE_QUEBRA: 'Ajuste - Quebra',
      AJUSTE_INVENTARIO: 'Ajuste - Inventário',
      DEVOLUCAO: 'Devolução',
      VENDA: 'Venda',
    };
    return tipos[tipo] || tipo;
  };

  const getTipoColor = (tipo: string) => {
    const colors: Record<string, string> = {
      ENTRADA: 'bg-green-100 text-green-700',
      AJUSTE_QUEBRA: 'bg-red-100 text-red-700',
      AJUSTE_INVENTARIO: 'bg-yellow-100 text-yellow-700',
      DEVOLUCAO: 'bg-blue-100 text-blue-700',
      VENDA: 'bg-purple-100 text-purple-700',
    };
    return colors[tipo] || 'bg-gray-100 text-gray-700';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-600">Carregando movimentações...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Movimentações de Estoque</h1>
          <p className="text-gray-600 mt-1">Registre entradas e ajustes de estoque</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Nova Movimentação
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Registrar Movimentação</DialogTitle>
              <DialogDescription>
                Registre uma entrada ou ajuste de estoque
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="produtoId">Produto *</Label>
                <Select
                  value={formData.produtoId}
                  onValueChange={(value) => setFormData({ ...formData, produtoId: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um produto" />
                  </SelectTrigger>
                  <SelectContent>
                    {produtos.map((produto) => (
                      <SelectItem key={produto.id} value={produto.id}>
                        {produto.nome} ({produto.sku}) - Estoque: {produto.estoqueAtual}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tipo">Tipo de Movimentação *</Label>
                <Select
                  value={formData.tipo}
                  onValueChange={(value) => setFormData({ ...formData, tipo: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ENTRADA">Entrada</SelectItem>
                    <SelectItem value="AJUSTE_QUEBRA">Ajuste - Quebra</SelectItem>
                    <SelectItem value="AJUSTE_INVENTARIO">Ajuste - Inventário</SelectItem>
                    <SelectItem value="DEVOLUCAO">Devolução</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="quantidade">Quantidade *</Label>
                <Input
                  id="quantidade"
                  type="number"
                  value={formData.quantidade}
                  onChange={(e) =>
                    setFormData({ ...formData, quantidade: e.target.value })
                  }
                  placeholder="Ex: 10 (positivo) ou -5 (negativo)"
                  required
                />
                <p className="text-xs text-gray-500">
                  Use valores positivos para aumentar o estoque e negativos para diminuir
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="motivo">Motivo</Label>
                <Textarea
                  id="motivo"
                  value={formData.motivo}
                  onChange={(e) =>
                    setFormData({ ...formData, motivo: e.target.value })
                  }
                  placeholder="Descreva o motivo da movimentação"
                  rows={3}
                />
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
                  {submitting ? 'Salvando...' : 'Salvar Movimentação'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        {movimentacoes.map((mov) => (
          <Card key={mov.id}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4 flex-1">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <ArrowRightLeft className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="font-medium text-lg">{mov.produto.nome}</h3>
                      <span className={`text-xs px-2 py-1 rounded ${getTipoColor(mov.tipo)}`}>
                        {getTipoLabel(mov.tipo)}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                      <div className="flex items-center space-x-2">
                        <Package className="h-4 w-4" />
                        <span>SKU: {mov.produto.sku}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">
                          Quantidade: {mov.quantidade > 0 ? '+' : ''}{mov.quantidade}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4" />
                        <span>{mov.usuario.nome || mov.usuario.name || mov.usuario.email}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4" />
                        <span>{new Date(mov.dataMovimentacao).toLocaleString('pt-BR')}</span>
                      </div>
                    </div>
                    {mov.motivo && (
                      <div className="mt-2 text-sm text-gray-600 bg-gray-50 p-2 rounded">
                        <strong>Motivo:</strong> {mov.motivo}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {movimentacoes.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ArrowRightLeft className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nenhuma movimentação registrada
            </h3>
            <p className="text-gray-600 text-center mb-4">
              Comece registrando uma entrada ou ajuste de estoque
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
