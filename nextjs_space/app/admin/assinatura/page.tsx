"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Loader2, ExternalLink, CreditCard, AlertTriangle, CheckCircle } from "lucide-react";

interface PaymentHistory {
  id: string;
  value: number;
  netValue: number;
  dateCreated: string;
  status: string;
  billingType: string;
  dueDate: string;
  invoiceUrl: string;
  description: string;
}

interface SubscriptionData {
  status: "ATIVO" | "PAUSADO" | "PENDENTE" | "EM_TESTE";
  vencimentoPlano: string;
  billing: {
    value: number;
    dueDate: string;
    invoiceUrl: string;
    bankSlipUrl?: string;
  } | null;
  history: PaymentHistory[];
}

export default function AssinaturaPage() {
  const [data, setData] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/assinatura/info")
      .then((res) => {
        if (!res.ok) throw new Error("Falha ao carregar dados");
        return res.json();
      })
      .then((data) => setData(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="rounded-md bg-red-50 p-4 text-red-600">
          Erro: {error}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const isTrial = data.status === "EM_TESTE";
  const isPaused = data.status === "PAUSADO";
  const isActive = data.status === "ATIVO";

  const statusColor = isTrial
    ? "bg-yellow-500"
    : isPaused
    ? "bg-red-500"
    : "bg-green-500";

  const statusLabel = isTrial
    ? "Período de Teste"
    : isPaused
    ? "Suspenso / Inadimplente"
    : "Ativo";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Minha Assinatura"
        description="Gerencie seu plano e visualize faturas"
      />

      <div className="grid gap-6 md:grid-cols-2">
        {/* Card Status do Plano */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Status do Plano
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Situação Atual</span>
              <Badge className={statusColor}>{statusLabel}</Badge>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Próximo Vencimento</span>
              <span className="text-lg font-bold">
                {data.vencimentoPlano
                  ? format(new Date(data.vencimentoPlano), "dd/MM/yyyy", { locale: ptBR })
                  : "-"}
              </span>
            </div>

            {isPaused && (
              <div className="flex items-center gap-2 rounded-md bg-red-50 p-3 text-sm text-red-700">
                <AlertTriangle className="h-4 w-4" />
                <span>Regularize seu pagamento para liberar o acesso.</span>
              </div>
            )}

            {isTrial && (
              <div className="flex items-center gap-2 rounded-md bg-yellow-50 p-3 text-sm text-yellow-700">
                <CheckCircle className="h-4 w-4" />
                <span>Aproveite seus dias grátis! A primeira cobrança será gerada ao fim do período.</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Card Fatura Atual / Ação */}
        <Card>
          <CardHeader>
            <CardTitle>Fatura Atual</CardTitle>
            <CardDescription>Gerencie seus pagamentos pendentes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.billing ? (
              <>
                <div className="flex flex-col gap-1">
                  <span className="text-2xl font-bold">
                    {new Intl.NumberFormat("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    }).format(data.billing.value)}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    Vence em {format(new Date(data.billing.dueDate), "dd 'de' MMMM", { locale: ptBR })}
                  </span>
                </div>

                <Button className="w-full" asChild>
                  <a href={data.billing.invoiceUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Pagar / Ver Fatura
                  </a>
                </Button>
              </>
            ) : (
                <div className="flex h-full flex-col items-center justify-center gap-2 py-4 text-center text-muted-foreground">
                    <CheckCircle className="h-8 w-8 text-green-500" />
                    <p>Nenhuma fatura pendente no momento.</p>
                </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Histórico */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Pagamentos</CardTitle>
        </CardHeader>
        <CardContent>
            {data.history.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Fatura</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.history.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell>
                    {format(new Date(payment.dateCreated), "dd/MM/yyyy", { locale: ptBR })}
                  </TableCell>
                  <TableCell>{payment.description || "Mensalidade"}</TableCell>
                  <TableCell>
                    {new Intl.NumberFormat("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    }).format(payment.value)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={payment.status === "RECEIVED" || payment.status === "CONFIRMED" ? "default" : "secondary"}>
                        {payment.status === "RECEIVED" || payment.status === "CONFIRMED" ? "Pago" :
                         payment.status === "PENDING" ? "Pendente" :
                         payment.status === "OVERDUE" ? "Vencido" : payment.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <a
                      href={payment.invoiceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      Ver
                    </a>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
            ) : (
                <p className="text-center text-muted-foreground">Nenhum histórico disponível.</p>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
