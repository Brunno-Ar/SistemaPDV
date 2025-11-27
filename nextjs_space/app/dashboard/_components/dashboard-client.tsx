
'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { DollarSign, Package as PackageIcon, ShoppingCart, TrendingUp, AlertCircle, Trophy, Target, Clock, AlertTriangle } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { NavBar } from '@/components/nav-bar'
import { useRouter } from 'next/navigation'

interface CaixaAberto {
  id: string
  saldoInicial: number
  dataAbertura: string
}

interface Aviso {
  id: string
  mensagem: string
  importante: boolean
  criadoEm: string
}

interface GamificationData {
  valorTotalHoje: number
  totalItens: number
  totalTransacoes: number
  meta: number
  progresso: string
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

export default function DashboardClient() {
  const { data: session } = useSession()
  const router = useRouter()
  const [caixaAberto, setCaixaAberto] = useState<CaixaAberto | null>(null)
  const [avisos, setAvisos] = useState<Aviso[]>([])
  const [gamification, setGamification] = useState<GamificationData | null>(null)
  const [lotesVencendo, setLotesVencendo] = useState<Lote[]>([])
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
      const [caixaRes, avisosRes, gamificationRes, lotesRes] = await Promise.all([
        fetch('/api/caixa'),
        fetch('/api/avisos'),
        fetch('/api/gamification'),
        fetch('/api/admin/lotes')
      ])

      if (caixaRes.ok) {
        const caixaData = await caixaRes.json()
        setCaixaAberto(caixaData.caixaAberto)
      }

      if (avisosRes.ok) {
        const avisosData = await avisosRes.json()
        setAvisos(avisosData)
      }

      if (gamificationRes.ok) {
        const gamificationData = await gamificationRes.json()
        setGamification(gamificationData)
      }

      if (lotesRes.ok) {
        const lotesData = await lotesRes.json()
        // Filtrar apenas lotes vencendo nos próximos 7 dias
        const hoje = new Date()
        const seteDias = new Date()
        seteDias.setDate(hoje.getDate() + 7)
        
        const lotesProximosVencimento = lotesData.filter((lote: Lote) => {
          const dataValidade = new Date(lote.dataValidade)
          return lote.quantidade > 0 && dataValidade >= hoje && dataValidade <= seteDias
        })
        
        setLotesVencendo(lotesProximosVencimento)
      }
    } catch (error) {
      console.error('Erro ao buscar dados do dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAbrirCaixa = async () => {
    if (!saldoInicial || parseFloat(saldoInicial) < 0) {
      toast({
        title: 'Erro',
        description: 'Informe um saldo inicial válido',
        variant: 'destructive'
      })
      return
    }

    setSubmitting(true)

    try {
      const response = await fetch('/api/caixa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'abrir',
          saldoInicial: parseFloat(saldoInicial)
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao abrir caixa')
      }

      toast({
        title: 'Sucesso',
        description: 'Caixa aberto com sucesso!',
      })

      setDialogOpen(false)
      setSaldoInicial('')
      fetchDashboardData()
    } catch (error) {
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao abrir caixa',
        variant: 'destructive'
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleFecharCaixa = async () => {
    if (!saldoFinal || parseFloat(saldoFinal) < 0) {
      toast({
        title: 'Erro',
        description: 'Informe um saldo final válido',
        variant: 'destructive'
      })
      return
    }

    setSubmitting(true)

    try {
      const response = await fetch('/api/caixa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'fechar',
          saldoFinal: parseFloat(saldoFinal)
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao fechar caixa')
      }

      const detalhes = data.detalhes

      toast({
        title: 'Caixa Fechado!',
        description: `Quebra de Caixa: R$ ${detalhes.quebraDeCaixa.toFixed(2)}`,
      })

      setDialogFecharOpen(false)
      setSaldoFinal('')
      fetchDashboardData()
    } catch (error) {
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao fechar caixa',
        variant: 'destructive'
      })
    } finally {
      setSubmitting(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatCurrency = (value: number) => `R$ ${value.toFixed(2)}`

  if (loading) {
    return (
      <div>
        <NavBar />
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-600">Carregando dashboard...</div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <NavBar />
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-gray-600">Olá, {session?.user?.name}! ({session?.user?.role})</p>
        </div>

        {/* Alerta de Lotes Vencendo */}
        {lotesVencendo.length > 0 && (
          <Alert variant="destructive" className="border-2 border-orange-500 bg-orange-50">
            <AlertTriangle className="h-5 w-5" />
            <AlertTitle className="text-lg font-semibold">
              ⚠️ Atenção: {lotesVencendo.length} lote(s) vencendo nos próximos 7 dias!
            </AlertTitle>
            <AlertDescription className="mt-2">
              <div className="space-y-2">
                {lotesVencendo.slice(0, 3).map((lote) => (
                  <div key={lote.id} className="flex items-center justify-between bg-white p-2 rounded">
                    <div>
                      <span className="font-medium">{lote.produto.nome}</span>
                      <span className="text-sm text-gray-600 ml-2">
                        (Lote: {lote.numeroLote})
                      </span>
                    </div>
                    <Badge variant="destructive">
                      {lote.diasParaVencer} {lote.diasParaVencer === 1 ? 'dia' : 'dias'}
                    </Badge>
                  </div>
                ))}
                {lotesVencendo.length > 3 && (
                  <p className="text-sm text-gray-700">
                    + {lotesVencendo.length - 3} lote(s) a mais
                  </p>
                )}
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-2"
                  onClick={() => router.push('/lotes')}
                >
                  Ver Todos os Lotes
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

      {/* Widget 1: Frente de Caixa */}
      <Card className="border-2 border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <DollarSign className="h-6 w-6 text-blue-600" />
            <span>Frente de Caixa</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!caixaAberto ? (
            <div className="space-y-4">
              <p className="text-gray-700">Você precisa abrir um caixa para começar a vender.</p>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="lg" className="w-full bg-green-600 hover:bg-green-700">
                    ABRIR CAIXA
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Abrir Caixa</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="saldoInicial">Saldo Inicial (Troco)</Label>
                      <Input
                        id="saldoInicial"
                        type="number"
                        step="0.01"
                        placeholder="Ex: 100.00"
                        value={saldoInicial}
                        onChange={(e) => setSaldoInicial(e.target.value)}
                      />
                    </div>
                    <Button onClick={handleAbrirCaixa} className="w-full" disabled={submitting}>
                      {submitting ? 'Abrindo...' : 'Confirmar Abertura'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <Badge className="bg-green-500">Caixa Aberto</Badge>
                    <Clock className="h-4 w-4 text-gray-600" />
                  </div>
                  <p className="text-sm text-gray-600">
                    Desde {formatDate(caixaAberto.dataAbertura)}
                  </p>
                </div>
                <p className="text-lg font-semibold">
                  Saldo Inicial: {formatCurrency(Number(caixaAberto.saldoInicial))}
                </p>
              </div>
              <Dialog open={dialogFecharOpen} onOpenChange={setDialogFecharOpen}>
                <DialogTrigger asChild>
                  <Button variant="destructive" className="w-full">
                    FECHAR CAIXA
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Fechar Caixa</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Conte o dinheiro total no caixa antes de fechar.
                      </AlertDescription>
                    </Alert>
                    <div>
                      <Label htmlFor="saldoFinal">Contagem Final</Label>
                      <Input
                        id="saldoFinal"
                        type="number"
                        step="0.01"
                        placeholder="Ex: 450.00"
                        value={saldoFinal}
                        onChange={(e) => setSaldoFinal(e.target.value)}
                      />
                    </div>
                    <Button onClick={handleFecharCaixa} className="w-full" disabled={submitting}>
                      {submitting ? 'Fechando...' : 'Confirmar Fechamento'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Widget 2: Gamificação */}
      <Card className="border-2 border-yellow-200 bg-yellow-50">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Trophy className="h-6 w-6 text-yellow-600" />
            <span>Meu Desempenho Hoje</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {gamification && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-lg text-center">
                  <DollarSign className="h-6 w-6 mx-auto text-green-600 mb-2" />
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(gamification.valorTotalHoje)}
                  </p>
                  <p className="text-sm text-gray-600">Total Vendido</p>
                </div>
                <div className="bg-white p-4 rounded-lg text-center">
                  <PackageIcon className="h-6 w-6 mx-auto text-blue-600 mb-2" />
                  <p className="text-2xl font-bold text-blue-600">{gamification.totalItens}</p>
                  <p className="text-sm text-gray-600">Itens Vendidos</p>
                </div>
                <div className="bg-white p-4 rounded-lg text-center">
                  <ShoppingCart className="h-6 w-6 mx-auto text-purple-600 mb-2" />
                  <p className="text-2xl font-bold text-purple-600">{gamification.totalTransacoes}</p>
                  <p className="text-sm text-gray-600">Transações</p>
                </div>
              </div>

              {/* Barra de Progresso da Meta */}
              <div className="bg-white p-4 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <Target className="h-5 w-5 text-orange-600" />
                    <p className="font-semibold">Meta Diária</p>
                  </div>
                  <p className="text-sm text-gray-600">
                    {gamification.progresso}% de {formatCurrency(gamification.meta)}
                  </p>
                </div>
                <Progress value={parseFloat(gamification.progresso)} className="h-3" />
                {parseFloat(gamification.progresso) >= 100 && (
                  <p className="text-sm text-green-600 mt-2 font-semibold">
                    🎉 Meta alcançada! Parabéns!
                  </p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Widget 3: Mural de Avisos */}
      <Card className="border-2 border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AlertCircle className="h-6 w-6 text-red-600" />
            <span>Mural de Avisos</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {avisos.length === 0 ? (
            <p className="text-gray-600">Nenhum aviso no momento.</p>
          ) : (
            <div className="space-y-3">
              {avisos.slice(0, 3).map((aviso) => (
                <Alert 
                  key={aviso.id} 
                  variant={aviso.importante ? "destructive" : "default"}
                  className="bg-white"
                >
                  {aviso.importante && <AlertCircle className="h-4 w-4" />}
                  <AlertTitle className="flex items-center justify-between">
                    {aviso.importante && <Badge variant="destructive">Importante</Badge>}
                    <span className="text-xs text-gray-500">{formatDate(aviso.criadoEm)}</span>
                  </AlertTitle>
                  <AlertDescription>{aviso.mensagem}</AlertDescription>
                </Alert>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </div>
  )
}
