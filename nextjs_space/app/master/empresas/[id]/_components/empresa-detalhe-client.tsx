
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Package, ShoppingCart, BarChart3, Users, Building2 } from 'lucide-react'
import EstoqueClient from '@/app/estoque/_components/estoque-client'
import MovimentacoesClient from '@/app/movimentacoes/_components/movimentacoes-client'
import RelatoriosClient from '@/app/relatorios/_components/relatorios-client'
import EquipeClient from '@/app/equipe/_components/equipe-client'

interface Empresa {
  id: string
  nome: string
  status: 'PENDENTE' | 'ATIVO' | 'PAUSADO'
  vencimentoPlano: Date | null
  createdAt: Date
  _count: {
    users: number
    products: number
    sales: number
  }
}

interface EmpresaDetalheClientProps {
  empresa: Empresa
}

export default function EmpresaDetalheClient({ empresa }: EmpresaDetalheClientProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('estoque')

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ATIVO':
        return <Badge className="bg-green-600">Ativo</Badge>
      case 'PENDENTE':
        return <Badge variant="secondary">Pendente</Badge>
      case 'PAUSADO':
        return <Badge variant="destructive">Pausado</Badge>
      default:
        return null
    }
  }

  const formatDate = (date: Date | null) => {
    if (!date) return 'Sem vencimento'
    return new Date(date).toLocaleDateString('pt-BR')
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => router.push('/master/empresas')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div className="flex items-center space-x-3">
            <Building2 className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold">{empresa.nome}</h1>
              <p className="text-sm text-gray-600">
                Modo Deus - Visualização completa da empresa
              </p>
            </div>
          </div>
        </div>
        {getStatusBadge(empresa.status)}
      </div>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>Informações da Empresa</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-600">Status</p>
              <p className="font-semibold">{empresa.status}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Vencimento</p>
              <p className="font-semibold">{formatDate(empresa.vencimentoPlano)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Usuários</p>
              <p className="font-semibold">{empresa._count.users}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Produtos</p>
              <p className="font-semibold">{empresa._count.products}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs com Módulos */}
      <Card>
        <CardHeader>
          <CardTitle>Módulos da Empresa</CardTitle>
          <p className="text-sm text-gray-600">
            Visualize e gerencie todos os módulos desta empresa
          </p>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4 mb-6">
              <TabsTrigger value="estoque" className="flex items-center space-x-2">
                <Package className="h-4 w-4" />
                <span>Estoque</span>
              </TabsTrigger>
              <TabsTrigger value="vendas" className="flex items-center space-x-2">
                <ShoppingCart className="h-4 w-4" />
                <span>Vendas</span>
              </TabsTrigger>
              <TabsTrigger value="financeiro" className="flex items-center space-x-2">
                <BarChart3 className="h-4 w-4" />
                <span>Financeiro</span>
              </TabsTrigger>
              <TabsTrigger value="equipe" className="flex items-center space-x-2">
                <Users className="h-4 w-4" />
                <span>Equipe</span>
              </TabsTrigger>
            </TabsList>

            {/* Aba Estoque */}
            <TabsContent value="estoque" className="mt-0">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-blue-900">
                  <strong>📦 Modo Deus Ativo:</strong> Você está visualizando e pode gerenciar o estoque de <strong>{empresa.nome}</strong>
                </p>
              </div>
              <EstoqueClient companyId={empresa.id} />
            </TabsContent>

            {/* Aba Vendas */}
            <TabsContent value="vendas" className="mt-0">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-blue-900">
                  <strong>🛒 Modo Deus Ativo:</strong> Histórico de vendas de <strong>{empresa.nome}</strong>
                </p>
              </div>
              <MovimentacoesClient companyId={empresa.id} />
            </TabsContent>

            {/* Aba Financeiro */}
            <TabsContent value="financeiro" className="mt-0">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-blue-900">
                  <strong>💰 Modo Deus Ativo:</strong> Relatórios financeiros de <strong>{empresa.nome}</strong>
                </p>
              </div>
              <RelatoriosClient companyId={empresa.id} />
            </TabsContent>

            {/* Aba Equipe */}
            <TabsContent value="equipe" className="mt-0">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-blue-900">
                  <strong>👥 Modo Deus Ativo:</strong> Gerenciamento de equipe de <strong>{empresa.nome}</strong>
                </p>
              </div>
              <EquipeClient companyId={empresa.id} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
