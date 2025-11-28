
'use client';

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import PageHeading from "@/components/page-heading";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from "recharts";

interface Analytics {
  totalVendasHoje: number;
  totalVendasSemana: number;
  totalVendasMes: number;
  custoTotalHoje: number;
  custoTotalSemana: number;
  custoTotalMes: number;
  lucroHoje: number;
  lucroSemana: number;
  lucroMes: number;
  margemHoje: number;
  margemSemana: number;
  margemMes: number;
  transacoesHoje: number;
  transacoesSemana: number;
  transacoesMes: number;
  produtosMaisVendidos: Array<{
    nome: string;
    totalVendido: number;
    valorTotal: number;
  }>;
  vendasPorMetodo: Array<{
    metodo: string;
    total: number;
    valor: number;
  }>;
}

interface RelatoriosClientProps {
  companyId?: string;
}

const KPICard = ({ title, value, isCurrency = true, isPositive = true }) => (
    <div className="bg-white dark:bg-background-dark dark:border dark:border-slate-800 rounded-xl p-6 shadow-sm">
        <h3 className="text-base font-medium text-[#4c739a] dark:text-slate-400 mb-2">{title}</h3>
        <p className={`text-4xl font-bold ${isPositive ? 'text-green-500' : 'text-[#0d141b] dark:text-slate-50'}`}>
            {isCurrency ? `R$ ${value.toFixed(2)}` : value}
        </p>
    </div>
);


export default function RelatoriosClient({ companyId }: RelatoriosClientProps = {}) {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    fetchFilteredData();
  }, [companyId]);

  const fetchFilteredData = async (start = dateRange.startDate, end = dateRange.endDate) => {
    if (!start || !end) {
      toast({
        title: "Erro",
        description: "Selecione as datas de início e fim",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({ startDate: start, endDate: end });
      if(companyId) params.append('companyId', companyId);

      const response = await fetch(`/api/admin/analytics?${params}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erro ao carregar dados');

      setAnalytics(data);
    } catch (error) {
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao carregar dados filtrados",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const setDatePreset = (preset: 'today' | 'yesterday' | 'this_month' | 'last_month') => {
    const today = new Date();
    let start = new Date();
    let end = new Date();

    switch (preset) {
        case 'today':
            break;
        case 'yesterday':
            start.setDate(today.getDate() - 1);
            end.setDate(today.getDate() - 1);
            break;
        case 'this_month':
            start = new Date(today.getFullYear(), today.getMonth(), 1);
            end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            break;
        case 'last_month':
            start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            end = new Date(today.getFullYear(), today.getMonth(), 0);
            break;
    }

    const startDate = start.toISOString().split('T')[0];
    const endDate = end.toISOString().split('T')[0];

    setDateRange({ startDate, endDate });
    fetchFilteredData(startDate, endDate);
};


  const methodColors = {
    dinheiro: "#4CAF50",
    debito: "#FFC107",
    credito: "#F44336",
    pix: "#2196F3",
  };

  return (
    <>
      <PageHeading title="Relatório de Vendas">
        <button className="flex items-center justify-center gap-2 min-w-[84px] cursor-pointer overflow-hidden rounded-lg h-10 px-4 bg-white dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 text-[#0d141b] text-sm font-bold leading-normal tracking-[0.015em] border border-slate-200 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
            <span className="material-symbols-outlined text-xl">download</span>
            <span className="truncate">Exportar</span>
        </button>
      </PageHeading>

      <div className="bg-white dark:bg-background-dark dark:border dark:border-slate-800 p-4 rounded-xl shadow-sm mb-8">
        <div className="flex flex-wrap items-end gap-4">
            <div className="flex items-center gap-2">
                <Button onClick={() => setDatePreset('today')}>Hoje</Button>
                <Button onClick={() => setDatePreset('yesterday')} variant="outline">Ontem</Button>
                <Button onClick={() => setDatePreset('this_month')} variant="outline">Este Mês</Button>
                <Button onClick={() => setDatePreset('last_month')} variant="outline">Mês Passado</Button>
            </div>
            <div className="flex flex-wrap items-end gap-4 flex-1 min-w-[320px]">
                <Label className="flex flex-col min-w-40 flex-1">
                    <p className="text-[#0d141b] dark:text-slate-300 text-sm font-medium leading-normal pb-2">Data de Início</p>
                    <Input type="date" value={dateRange.startDate} onChange={e => setDateRange({...dateRange, startDate: e.target.value})} />
                </Label>
                <Label className="flex flex-col min-w-40 flex-1">
                    <p className="text-[#0d141b] dark:text-slate-300 text-sm font-medium leading-normal pb-2">Data de Fim</p>
                    <Input type="date" value={dateRange.endDate} onChange={e => setDateRange({...dateRange, endDate: e.target.value})} />
                </Label>
            </div>
            <Button onClick={() => fetchFilteredData()}>Aplicar Filtros</Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-10">Carregando dados...</div>
      ) : analytics ? (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <KPICard title="Custo da Mercadoria Vendida (CMV)" value={analytics.custoTotalMes} isPositive={false} />
                <KPICard title="Lucro Líquido" value={analytics.lucroMes} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <div className="lg:col-span-3 bg-white dark:bg-background-dark dark:border dark:border-slate-800 rounded-xl p-6 shadow-sm">
                    <h3 className="text-lg font-bold text-[#0d141b] dark:text-slate-50 mb-4">Top 5 Produtos Mais Vendidos</h3>
                    <ResponsiveContainer width="100%" height={320}>
                        <BarChart data={analytics.produtosMaisVendidos.slice(0, 5)}>
                            <XAxis dataKey="nome" stroke="#888888" fontSize={12} tickLine={false} axisLine={false}/>
                            <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`}/>
                            <Tooltip />
                            <Bar dataKey="totalVendido" fill="#137fec" radius={[4, 4, 0, 0]} name="Quantidade Vendida"/>
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div className="lg:col-span-2 bg-white dark:bg-background-dark dark:border dark:border-slate-800 rounded-xl p-6 shadow-sm">
                    <h3 className="text-lg font-bold text-[#0d141b] dark:text-slate-50 mb-4">Distribuição por Forma de Pagamento</h3>
                    <ResponsiveContainer width="100%" height={320}>
                        <PieChart>
                            <Pie data={analytics.vendasPorMetodo} dataKey="valor" nameKey="metodo" cx="50%" cy="50%" outerRadius={100} label>
                                {analytics.vendasPorMetodo.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={methodColors[entry.metodo.toLowerCase() as keyof typeof methodColors] || '#8884d8'} />
                                ))}
                            </Pie>
                            <Tooltip formatter={(value: number) => `R$ ${value.toFixed(2)}`} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </>
      ) : (
        <div className="text-center py-10">Nenhum dado para exibir.</div>
      )}
    </>
  );
}
