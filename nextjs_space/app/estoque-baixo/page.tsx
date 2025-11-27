
'use client';

import { useEffect, useState } from 'react';
import { NavBar } from '@/components/nav-bar';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, Package, TrendingDown } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import Image from 'next/image';

interface ProdutoEstoqueBaixo {
  id: string;
  nome: string;
  sku: string;
  precoVenda: number;
  estoqueAtual: number;
  estoqueMinimo: number;
  imagemUrl: string | null;
}

export default function EstoqueBaixoPage() {
  const [produtos, setProdutos] = useState<ProdutoEstoqueBaixo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProdutosEstoqueBaixo();
  }, []);

  const fetchProdutosEstoqueBaixo = async () => {
    try {
      const response = await fetch('/api/admin/estoque-baixo');
      if (!response.ok) throw new Error('Erro ao buscar produtos');
      const data = await response.json();
      
      // Ensure data is an array
      if (Array.isArray(data)) {
        setProdutos(data);
      } else {
        setProdutos([]);
      }
    } catch (error) {
      console.error('Erro ao buscar produtos com estoque baixo:', error);
      setProdutos([]);
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Não foi possível carregar produtos com estoque baixo',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <NavBar />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex justify-center items-center h-64">
            <div className="text-gray-600">Carregando produtos...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <TrendingDown className="h-8 w-8 text-orange-600" />
            <h1 className="text-3xl font-bold text-gray-900">Estoque Baixo</h1>
          </div>
          <p className="text-gray-600">
            Produtos que atingiram ou estão abaixo do estoque mínimo
          </p>
        </div>

        {produtos.length > 0 ? (
          <>
            <div className="bg-orange-50 border-l-4 border-orange-400 p-4 mb-6">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-orange-600 mr-3" />
                <div>
                  <p className="text-sm font-medium text-orange-800">
                    Atenção! {produtos.length} {produtos.length === 1 ? 'produto requer' : 'produtos requerem'} reposição
                  </p>
                  <p className="text-sm text-orange-700 mt-1">
                    Os produtos abaixo atingiram o estoque mínimo. Considere fazer uma reposição.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {produtos.map((produto) => {
                const deficit = produto.estoqueMinimo - produto.estoqueAtual;
                const percentual = Math.round((produto.estoqueAtual / produto.estoqueMinimo) * 100);

                return (
                  <Card key={produto.id} className="overflow-hidden border-orange-200">
                    <div className="relative bg-gray-100 aspect-square">
                      {produto.imagemUrl ? (
                        <Image
                          src={produto.imagemUrl}
                          alt={produto.nome}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Package className="h-16 w-16 text-gray-400" />
                        </div>
                      )}
                      <div className="absolute top-2 right-2">
                        <span className="bg-orange-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                          {percentual}% do mínimo
                        </span>
                      </div>
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-bold text-lg mb-1">{produto.nome}</h3>
                      <p className="text-sm text-gray-600 mb-3">SKU: {produto.sku}</p>

                      <div className="space-y-2 mb-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Estoque Atual:</span>
                          <span className="font-bold text-orange-600">{produto.estoqueAtual}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Estoque Mínimo:</span>
                          <span className="font-medium">{produto.estoqueMinimo}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Déficit:</span>
                          <span className="font-bold text-red-600">
                            {deficit > 0 ? deficit : 0} unidades
                          </span>
                        </div>
                      </div>

                      <div className="pt-3 border-t">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Preço:</span>
                          <span className="text-lg font-bold text-blue-600">
                            R$ {Number(produto.precoVenda).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="p-4 bg-green-100 rounded-full mb-4">
                <Package className="h-12 w-12 text-green-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Tudo certo com o estoque!
              </h3>
              <p className="text-gray-600 text-center">
                Nenhum produto está abaixo do estoque mínimo no momento
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
