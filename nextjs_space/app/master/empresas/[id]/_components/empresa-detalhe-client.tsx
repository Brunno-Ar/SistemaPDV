"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Mail, ExternalLink, CreditCard } from "lucide-react";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Building2,
  Package,
  ShoppingCart,
  BarChart3,
  Users,
} from "lucide-react";
import { InteractiveHoverButton } from "@/components/ui/interactive-hover-button";
import EstoqueClient from "@/app/estoque/_components/estoque-client";
import MovimentacoesClient from "@/app/movimentacoes/_components/movimentacoes-client";
import RelatoriosClient from "@/app/relatorios/_components/relatorios-client";
import EquipeClient from "@/app/equipe/_components/equipe-client";

interface EmpresaDetalheClientProps {
  empresa: {
    id: string;
    nome: string;
    status: string;
    vencimentoPlano: Date | null;
    cpfCnpj?: string | null;
    telefone?: string | null;
    enderecoCep?: string | null;
    enderecoLogradouro?: string | null;
    enderecoNumero?: string | null;
    enderecoBairro?: string | null;
    enderecoCidade?: string | null;
    enderecoUf?: string | null;
    asaasCustomerId?: string | null;
    _count: {
      users: number;
      products: number;
    };
  };
  companyId: string;
}

export default function EmpresaDetalheClient({
  empresa,
  companyId,
}: EmpresaDetalheClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("estoque");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [sending, setSending] = useState(false);

  const handleSendAviso = async () => {
    if (!mensagem.trim()) return;
    setSending(true);

    try {
      const response = await fetch("/api/avisos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mensagem,
          importante: true,
          targetEmpresaId: companyId, // Envia para esta empresa
        }),
      });

      if (!response.ok) throw new Error("Erro ao enviar aviso");

      toast({
        title: "Sucesso",
        description: "Aviso enviado para a empresa com sucesso!",
      });
      setDialogOpen(false);
      setMensagem("");
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao enviar aviso.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ATIVO":
        return <Badge className="bg-green-600">Ativo</Badge>;
      case "PENDENTE":
        return <Badge variant="secondary">Pendente</Badge>;
      case "PAUSADO":
        return <Badge variant="destructive">Pausado</Badge>;
      default:
        return null;
    }
  };

  const formatDate = (date: Date | null) => {
    if (!date) return "Sem vencimento";
    return new Date(date).toLocaleDateString("pt-BR");
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <InteractiveHoverButton
            onClick={() => router.push("/master/empresas")}
            className="bg-white hover:bg-gray-50 text-gray-700 border-gray-200"
          >
            <span className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </span>
          </InteractiveHoverButton>
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

        <div className="flex items-center gap-4">
          {/* Botão Ver Boletos no Asaas */}
          {empresa.asaasCustomerId && (
            <Button
              variant="outline"
              className="gap-2"
              onClick={() =>
                window.open(
                  `https://www.asaas.com/customerAccount/show/${empresa.asaasCustomerId}`,
                  "_blank"
                )
              }
            >
              <CreditCard className="h-4 w-4" />
              Ver Boletos
              <ExternalLink className="h-3 w-3" />
            </Button>
          )}

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Mail className="h-4 w-4" />
                Enviar Aviso
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Enviar Aviso para {empresa.nome}</DialogTitle>
                <DialogDescription>
                  Esta mensagem aparecerá no mural de avisos dos administradores
                  desta empresa.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Mensagem</Label>
                  <Textarea
                    placeholder="Digite o aviso importante..."
                    value={mensagem}
                    onChange={(e) => setMensagem(e.target.value)}
                    rows={4}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button onClick={handleSendAviso} disabled={sending}>
                    {sending ? "Enviando..." : "Enviar Aviso"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          {getStatusBadge(empresa.status)}
        </div>
      </div>

      {/* ... (rest of the component) */}

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>Informações da Empresa</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Status</p>
              <p className="font-semibold dark:text-gray-100">
                {empresa.status}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Vencimento
              </p>
              <p className="font-semibold dark:text-gray-100">
                {formatDate(empresa.vencimentoPlano)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Usuários
              </p>
              <p className="font-semibold dark:text-gray-100">
                {empresa._count.users}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Produtos
              </p>
              <p className="font-semibold dark:text-gray-100">
                {empresa._count.products}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dados Cadastrais Card */}
      <Card>
        <CardHeader>
          <CardTitle>Dados Cadastrais</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                Documento (CNPJ/CPF)
              </p>
              <p className="font-semibold text-gray-900 dark:text-gray-100">
                {empresa.cpfCnpj || "-"}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                Contato
              </p>
              <p className="font-semibold text-gray-900 dark:text-gray-100">
                {empresa.telefone || "-"}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                Endereço
              </p>
              <div className="text-gray-900 dark:text-gray-100 font-semibold">
                {empresa.enderecoLogradouro ? (
                  <>
                    <p>
                      {empresa.enderecoLogradouro}, {empresa.enderecoNumero}
                    </p>
                    <p>
                      {empresa.enderecoBairro} - {empresa.enderecoCidade}/
                      {empresa.enderecoUf}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      CEP: {empresa.enderecoCep}
                    </p>
                  </>
                ) : (
                  "-"
                )}
              </div>
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
              <TabsTrigger
                value="estoque"
                className="flex items-center space-x-2"
              >
                <Package className="h-4 w-4" />
                <span>Estoque</span>
              </TabsTrigger>
              <TabsTrigger
                value="vendas"
                className="flex items-center space-x-2"
              >
                <ShoppingCart className="h-4 w-4" />
                <span>Vendas</span>
              </TabsTrigger>
              <TabsTrigger
                value="financeiro"
                className="flex items-center space-x-2"
              >
                <BarChart3 className="h-4 w-4" />
                <span>Financeiro</span>
              </TabsTrigger>
              <TabsTrigger
                value="equipe"
                className="flex items-center space-x-2"
              >
                <Users className="h-4 w-4" />
                <span>Equipe</span>
              </TabsTrigger>
            </TabsList>

            {/* Aba Estoque */}
            <TabsContent value="estoque" className="mt-0">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-blue-900">
                  <strong>📦 Modo Deus Ativo:</strong> Você está visualizando e
                  pode gerenciar o estoque de <strong>{empresa.nome}</strong>
                </p>
              </div>
              <EstoqueClient companyId={companyId} />
            </TabsContent>

            {/* Aba Vendas */}
            <TabsContent value="vendas" className="mt-0">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-blue-900">
                  <strong>🛒 Modo Deus Ativo:</strong> Histórico de vendas de{" "}
                  <strong>{empresa.nome}</strong>
                </p>
              </div>
              <MovimentacoesClient companyId={companyId} />
            </TabsContent>

            {/* Aba Financeiro */}
            <TabsContent value="financeiro" className="mt-0">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-blue-900">
                  <strong>💰 Modo Deus Ativo:</strong> Relatórios financeiros de{" "}
                  <strong>{empresa.nome}</strong>
                </p>
              </div>
              <RelatoriosClient companyId={companyId} />
            </TabsContent>

            {/* Aba Equipe */}
            <TabsContent value="equipe" className="mt-0">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-blue-900">
                  <strong>👥 Modo Deus Ativo:</strong> Gerenciamento de equipe
                  de <strong>{empresa.nome}</strong>
                </p>
              </div>
              <EquipeClient companyId={companyId} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
