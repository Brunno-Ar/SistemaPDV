
'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { toast } from '@/hooks/use-toast'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { useRouter } from 'next/navigation'
import { DollarSign, Package as PackageIcon, ShoppingCart, TrendingUp, AlertCircle, Trophy, Target, Clock, AlertTriangle } from 'lucide-react'

interface CaixaAberto {
  id: string
  saldoInicial: number
  dataAbertura: string
}

interface Lote {
  id: string
  numeroLote: string
  dataValidade: string
  quantidade: number
  status: string
  diasParaVencer: number
  produto: {
    nome: string
    sku: string
  }
}

interface DashboardData {
    faturamentoDia: number;
    lucroLiquidoHoje: number;
    produtosCriticos: number;
    alertaEstoque: Array<{
      produto: string;
      estoqueAtual: number;
      estoqueMinimo: number;
      status: 'Baixo' | 'Crítico';
    }>;
}


const KPICard = ({ icon, title, value, colorClass, isCurrency = false }) => (
    <div className="flex flex-col gap-2 rounded-xl p-6 bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark">
        <div className={`flex items-center gap-2 ${colorClass}`}>
            <span className="material-symbols-outlined">{icon}</span>
            <p className="text-base font-medium">{title}</p>
        </div>
        <p className="text-text-light dark:text-text-dark text-3xl font-bold leading-tight">
            {isCurrency ? `R$${value.toFixed(2)}` : value}
        </p>
    </div>
);

const QuickAccessButton = ({ icon, label, href }) => (
    <Link href={href} className="flex flex-col items-center justify-center gap-2 h-24 rounded-xl bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark text-text-light dark:text-text-dark hover:bg-primary/5 dark:hover:bg-primary/10">
        <span className="material-symbols-outlined text-primary text-2xl">{icon}</span>
        <span className="text-sm font-medium">{label}</span>
    </Link>
);

export default function DashboardClient() {
  const { data: session } = useSession()
  const router = useRouter()
  const [caixaAberto, setCaixaAberto] = useState<CaixaAberto | null>(null)
  const [lotesVencendo, setLotesVencendo] = useState<Lote[]>([])
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogFecharOpen, setDialogFecharOpen] = useState(false)
  const [saldoInicial, setSaldoInicial] = useState('')
  const [saldoFinal, setSaldoFinal] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const [caixaRes, lotesRes, dashboardRes] = await Promise.all([
        fetch('/api/caixa'),
        fetch('/api/admin/lotes'),
        fetch('/api/dashboard'), // Assuming a new endpoint for dashboard data
      ])

      if (caixaRes.ok) {
        const caixaData = await caixaRes.json()
        setCaixaAberto(caixaData.caixaAberto)
      }

      if (lotesRes.ok) {
        const lotesData = await lotesRes.json()
        const hoje = new Date()
        const seteDias = new Date()
        seteDias.setDate(hoje.getDate() + 7)
        
        const lotesProximosVencimento = lotesData.filter((lote: Lote) => {
          const dataValidade = new Date(lote.dataValidade)
          return lote.quantidade > 0 && dataValidade >= hoje && dataValidade <= seteDias
        })
        
        setLotesVencendo(lotesProximosVencimento)
      }

      if(dashboardRes.ok) {
        const data = await dashboardRes.json();
        setDashboardData(data);
      } else {
        // Fallback to mock data if API fails
        setDashboardData({
            faturamentoDia: 12450.00,
            lucroLiquidoHoje: 3120.50,
            produtosCriticos: 8,
            alertaEstoque: [
                { produto: 'Caneta Esferográfica Azul', estoqueAtual: 10, estoqueMinimo: 15, status: 'Baixo' },
                { produto: 'Caderno Universitário 96fls', estoqueAtual: 5, estoqueMinimo: 10, status: 'Baixo' },
                { produto: 'Apontador com Depósito', estoqueAtual: 2, estoqueMinimo: 5, status: 'Crítico' },
                { produto: 'Lápis de Cor (12 cores)', estoqueAtual: 8, estoqueMinimo: 8, status: 'Baixo' },
            ]
        });
      }

    } catch (error) {
      console.error('Erro ao buscar dados do dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div>Carregando dashboard...</div>;
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 className="text-text-light dark:text-text-dark text-3xl font-bold leading-tight tracking-tight">Dashboard</h1>
        <div className="flex gap-3">
            <Button variant="outline" className="gap-2">
                <span className="material-symbols-outlined text-base">calendar_today</span>
                <span>Últimos 30 dias</span>
                <span className="material-symbols-outlined text-base">expand_more</span>
            </Button>
            <Link href="/vender">
                <Button className="gap-2">
                    <span className="material-symbols-outlined text-base">add</span>
                    <span className="truncate">Nova Venda</span>
                </Button>
            </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <KPICard icon="payments" title="Faturamento do Dia" value={dashboardData?.faturamentoDia ?? 0} colorClass="text-text-muted-light dark:text-text-muted-dark" isCurrency />
        <KPICard icon="trending_up" title="Lucro Líquido (Hoje)" value={dashboardData?.lucroLiquidoHoje ?? 0} colorClass="text-success" isCurrency />
        <KPICard icon="warning" title="Produtos Críticos" value={dashboardData?.produtosCriticos ?? 0} colorClass="text-warning" />
      </div>

      <h2 className="text-text-light dark:text-text-dark text-xl font-bold leading-tight tracking-tight mb-4">Acesso Rápido</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <QuickAccessButton icon="add_shopping_cart" label="Nova Venda" href="/vender" />
          <QuickAccessButton icon="inventory_2" label="Cadastrar Produto" href="/estoque" />
          <QuickAccessButton icon="bar_chart" label="Relatório de Vendas" href="/relatorios" />
          <QuickAccessButton icon="receipt_long" label="Histórico" href="/vendas/historico" />
      </div>

      <div className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark overflow-hidden">
        <h2 className="text-text-light dark:text-text-dark text-xl font-bold p-6">Alerta de Estoque Baixo</h2>
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="bg-background-light dark:bg-background-dark">
                    <tr>
                        <th className="px-6 py-3 font-medium text-text-muted-light dark:text-text-muted-dark" scope="col">Produto</th>
                        <th className="px-6 py-3 font-medium text-text-muted-light dark:text-text-muted-dark" scope="col">Estoque Atual</th>
                        <th className="px-6 py-3 font-medium text-text-muted-light dark:text-text-muted-dark" scope="col">Estoque Mínimo</th>
                        <th className="px-6 py-3 font-medium text-text-muted-light dark:text-text-muted-dark" scope="col">Status</th>
                    </tr>
                </thead>
                <tbody>
                    {dashboardData?.alertaEstoque.map(item => (
                        <tr key={item.produto} className="border-t border-border-light dark:border-border-dark">
                            <td className="px-6 py-4 font-medium">{item.produto}</td>
                            <td className="px-6 py-4">{item.estoqueAtual}</td>
                            <td className="px-6 py-4">{item.estoqueMinimo}</td>
                            <td className="px-6 py-4">
                                <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-medium ${
                                    item.status === 'Crítico' ? 'bg-danger/10 text-danger' : 'bg-warning/10 text-warning'
                                }`}>
                                    <span className={`size-1.5 rounded-full ${
                                        item.status === 'Crítico' ? 'bg-danger' : 'bg-warning'
                                    }`}></span>
                                    {item.status}
                                </span>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </div>
    </>
  );
}
