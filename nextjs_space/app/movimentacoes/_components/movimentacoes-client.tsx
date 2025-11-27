
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Calendar, User, ShoppingCart, DollarSign, Package, Tag, TrendingDown } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface VendaItem {
  id: string;
  produto: string;
  sku: string;
  quantidade: number;
  precoUnitario: number;
  descontoAplicado: number;
  subtotal: number;
}

interface Venda {
  id: string;
  dataHora: string;
  valorTotal: number;
  metodoPagamento: string;
  vendedor: string;
  itens: VendaItem[];
}

interface MovimentacoesClientProps {
  companyId?: string; // Opcional: usado pelo Master
}

export default function MovimentacoesClient({ companyId }: MovimentacoesClientProps = {}) {
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVendas();
  }, [companyId]); // Re-fetch quando companyId mudar

  const fetchVendas = async () => {
    try {
      // 🔥 Incluir companyId se fornecido
      const url = companyId 
        ? `/api/admin/vendas?companyId=${companyId}` 
        : '/api/admin/vendas'
      
      const response = await fetch(url);
      if (!response.ok) throw new Error('Erro ao buscar vendas');
      const data = await response.json();
      
      if (Array.isArray(data)) {
        setVendas(data);
      } else {
        setVendas([]);
      }
    } catch (error) {
      console.error('Erro ao buscar vendas:', error);
      setVendas([]);
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Não foi possível carregar as vendas',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getMetodoPagamentoLabel = (metodo: string) => {
    const metodos: Record<string, string> = {
      dinheiro: 'Dinheiro',
      debito: 'Cartão de Débito',
      credito: 'Cartão de Crédito',
      pix: 'PIX',
    };
    return metodos[metodo] || metodo;
  };

  const getMetodoPagamentoColor = (metodo: string) => {
    const colors: Record<string, string> = {
      dinheiro: 'bg-green-100 text-green-700',
      debito: 'bg-blue-100 text-blue-700',
      credito: 'bg-purple-100 text-purple-700',
      pix: 'bg-teal-100 text-teal-700',
    };
    return colors[metodo] || 'bg-gray-100 text-gray-700';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-600">Carregando vendas...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Histórico de Vendas</h1>
        <p className="text-gray-600 mt-1">Visualize todas as vendas realizadas com detalhes dos itens</p>
      </div>

      {vendas.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ShoppingCart className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nenhuma venda registrada
            </h3>
            <p className="text-gray-600 text-center mb-4">
              As vendas realizadas aparecerão aqui
            </p>
          </CardContent>
        </Card>
      ) : (
        <Accordion type="single" collapsible className="space-y-4">
          {vendas.map((venda) => (
            <AccordionItem key={venda.id} value={venda.id} className="border rounded-lg bg-white shadow-sm">
              <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-gray-50">
                <div className="flex items-center justify-between w-full pr-4">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <ShoppingCart className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="text-left">
                      <div className="flex items-center space-x-3 mb-1">
                        <span className="font-semibold text-lg text-gray-900">
                          Venda #{venda.id.substring(0, 8)}
                        </span>
                        <Badge className={getMetodoPagamentoColor(venda.metodoPagamento)}>
                          {getMetodoPagamentoLabel(venda.metodoPagamento)}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-4 w-4" />
                          <span>{new Date(venda.dataHora).toLocaleString('pt-BR')}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <User className="h-4 w-4" />
                          <span>{venda.vendedor}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Valor Total</p>
                      <p className="text-xl font-bold text-green-600">
                        R$ {venda.valorTotal.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4">
                <div className="mt-4 space-y-3">
                  <h4 className="font-medium text-sm text-gray-700 mb-3">Itens da Venda:</h4>
                  {venda.itens.map((item) => (
                    <div key={item.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <div className="md:col-span-2">
                          <div className="flex items-start space-x-2">
                            <Package className="h-4 w-4 text-gray-500 mt-1" />
                            <div>
                              <p className="font-medium text-gray-900">{item.produto}</p>
                              <p className="text-xs text-gray-500">SKU: {item.sku}</p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Quantidade:</span>
                            <span className="font-medium">{item.quantidade} un.</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Preço Unit.:</span>
                            <span className="font-medium">R$ {item.precoUnitario.toFixed(2)}</span>
                          </div>
                        </div>

                        <div className="space-y-1">
                          {item.descontoAplicado > 0 && (
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600 flex items-center gap-1">
                                <TrendingDown className="h-3 w-3 text-red-500" />
                                Desconto:
                              </span>
                              <span className="font-medium text-red-600">
                                - R$ {item.descontoAplicado.toFixed(2)}
                              </span>
                            </div>
                          )}
                          <div className="flex items-center justify-between text-sm pt-1 border-t border-gray-300">
                            <span className="text-gray-600">Subtotal:</span>
                            <span className="font-bold text-green-600">R$ {item.subtotal.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {/* Resumo do Total */}
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">
                        Total de itens: <span className="font-medium">{venda.itens.length}</span>
                      </span>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">Valor Total da Venda</p>
                        <p className="text-2xl font-bold text-green-600">
                          R$ {venda.valorTotal.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </div>
  );
}
