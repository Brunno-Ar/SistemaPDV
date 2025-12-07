"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Loader2,
  ExternalLink,
  CreditCard,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Calendar,
  Phone,
} from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

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
  status: "ATIVO" | "PAUSADO" | "PENDENTE" | "EM_TESTE" | "CANCELADO";
  vencimentoPlano: string;
  plano: string;
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
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState("");
  const [motivoCancelamento, setMotivoCancelamento] = useState("");

  const fetchData = () => {
    setLoading(true);
    fetch("/api/admin/assinatura/info")
      .then((res) => {
        if (!res.ok) throw new Error("Falha ao carregar dados");
        return res.json();
      })
      .then((data) => setData(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUpdateCard = () => {
    if (data?.billing?.invoiceUrl) {
      window.open(data.billing.invoiceUrl, "_blank");
    } else {
      toast.info(
        "Para atualizar o cartão, entre em contato com o suporte ou aguarde a próxima fatura."
      );
    }
  };

  const handleCancelSubscription = async () => {
    if (!motivoCancelamento) {
      toast.error("Por favor, selecione um motivo para o cancelamento.");
      return;
    }

    setCancelling(true);
    try {
      const res = await fetch("/api/admin/assinatura/cancel", {
        method: "POST",
        body: JSON.stringify({ motivo: motivoCancelamento }),
      });
      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Erro ao cancelar");
      }

      toast.success(
        "Assinatura cancelada. O acesso continua até o fim do período pago."
      );
      fetchData();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Erro ao cancelar assinatura"
      );
    } finally {
      setCancelling(false);
    }
  };

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
  const isCancelled = data.status === "CANCELADO";

  const trialDaysLeft = data.vencimentoPlano
    ? Math.max(0, differenceInDays(new Date(data.vencimentoPlano), new Date()))
    : 0;

  const statusConfig = {
    EM_TESTE: {
      color: "bg-blue-500",
      label: `Período de Teste (${trialDaysLeft} dias)`,
      icon: Clock,
    },
    PAUSADO: {
      color: "bg-red-500",
      label: "Suspenso / Inadimplente",
      icon: AlertTriangle,
    },
    ATIVO: { color: "bg-green-500", label: "Ativo", icon: CheckCircle },
    CANCELADO: { color: "bg-gray-500", label: "Cancelado", icon: XCircle },
    PENDENTE: { color: "bg-yellow-500", label: "Pendente", icon: Clock },
    // Default fallback para evitar undefined access
  } as const;

  const status = statusConfig[data.status] || {
    color: "bg-gray-500",
    label: data.status,
    icon: Clock,
  };
  const StatusIcon = status.icon;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Minha Assinatura"
        description="Gerencie seu plano e visualize faturas"
        actions={
          <Button variant="outline" asChild className="gap-2">
            <a
              href="https://wa.me/5511999999999"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Phone className="h-4 w-4" />
              Suporte Financeiro
            </a>
          </Button>
        }
      />

      <div className="grid gap-6 md:grid-cols-2">
        {/* Card Status do Plano */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Status do Plano
            </CardTitle>
            <CardDescription>Plano {data.plano || "PRO"}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">
                Situação Atual
              </span>
              <Badge className={`${status.color} flex items-center gap-1`}>
                <StatusIcon className="h-3 w-3" />
                {status.label}
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">
                <Calendar className="mr-1 inline h-4 w-4" />
                {isTrial ? "Fim do Teste" : "Próximo Vencimento"}
              </span>
              <span className="text-lg font-bold">
                {data.vencimentoPlano
                  ? format(new Date(data.vencimentoPlano), "dd/MM/yyyy", {
                      locale: ptBR,
                    })
                  : "-"}
              </span>
            </div>

            {isPaused && (
              <div className="flex items-center gap-2 rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
                <AlertTriangle className="h-4 w-4" />
                <span>Regularize seu pagamento para liberar o acesso.</span>
              </div>
            )}

            {isTrial && (
              <div className="flex items-center gap-2 rounded-md bg-blue-50 p-3 text-sm text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
                <Clock className="h-4 w-4" />
                <span>
                  Aproveite seus {trialDaysLeft} dias grátis! A primeira
                  cobrança será gerada ao fim do período.
                </span>
              </div>
            )}

            {isCancelled && (
              <div className="flex items-center gap-2 rounded-md bg-gray-50 p-3 text-sm text-gray-700 dark:bg-gray-900/20 dark:text-gray-400">
                <XCircle className="h-4 w-4" />
                <span>
                  Sua assinatura foi cancelada. Entre em contato para reativar.
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Card Fatura Atual / Ação */}
        <Card>
          <CardHeader>
            <CardTitle>Fatura Atual</CardTitle>
            <CardDescription>
              Gerencie seus pagamentos pendentes
            </CardDescription>
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
                    Vence em{" "}
                    {format(new Date(data.billing.dueDate), "dd 'de' MMMM", {
                      locale: ptBR,
                    })}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    onClick={handleUpdateCard}
                    className="w-full"
                  >
                    <CreditCard className="mr-2 h-4 w-4" />
                    Atualizar Cartão
                  </Button>
                  <Button className="w-full" asChild>
                    <a
                      href={data.billing.invoiceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Pagar / Ver Fatura
                    </a>
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-2 py-4 text-center text-muted-foreground">
                <CheckCircle className="h-8 w-8 text-green-500" />
                <p>Nenhuma fatura pendente no momento.</p>
              </div>
            )}

            {/* Botão Cancelar Assinatura */}
            {(isActive || isTrial) && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    className="mt-4 w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Cancelar Assinatura
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Cancelar assinatura?</AlertDialogTitle>
                    <AlertDialogDescription asChild>
                      <div className="space-y-4">
                        <p>
                          Ao cancelar, você perderá o acesso ao sistema após o
                          fim do período atual. Essa ação pode ser revertida
                          entrando em contato com o suporte.
                        </p>
                        <div className="space-y-2 text-left">
                          <Label>Por que você está cancelando?</Label>
                          <Select onValueChange={setMotivoCancelamento}>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione um motivo" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="financeiro">
                                Preço / Financeiro
                              </SelectItem>
                              <SelectItem value="funcionalidade">
                                Falta de Funcionalidade
                              </SelectItem>
                              <SelectItem value="concorrente">
                                Migrei para Concorrente
                              </SelectItem>
                              <SelectItem value="fechamento">
                                Fechei a Loja
                              </SelectItem>
                              <SelectItem value="suporte">
                                Problemas com Suporte
                              </SelectItem>
                              <SelectItem value="outro">Outro</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Voltar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={(e) => {
                        if (!motivoCancelamento) {
                          e.preventDefault();
                          toast.error("Selecione um motivo");
                          return;
                        }
                        handleCancelSubscription();
                      }}
                      className="bg-red-600 hover:bg-red-700"
                      disabled={cancelling}
                    >
                      {cancelling ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <XCircle className="mr-2 h-4 w-4" />
                      )}
                      Confirmar Cancelamento
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
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
                      {format(new Date(payment.dateCreated), "dd/MM/yyyy", {
                        locale: ptBR,
                      })}
                    </TableCell>
                    <TableCell>
                      {payment.description || "Mensalidade"}
                    </TableCell>
                    <TableCell>
                      {new Intl.NumberFormat("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      }).format(payment.value)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          payment.status === "RECEIVED" ||
                          payment.status === "CONFIRMED"
                            ? "default"
                            : payment.status === "OVERDUE"
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {payment.status === "RECEIVED" ||
                        payment.status === "CONFIRMED"
                          ? "Pago"
                          : payment.status === "PENDING"
                          ? "Pendente"
                          : payment.status === "OVERDUE"
                          ? "Vencido"
                          : payment.status}
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
            <p className="text-center text-muted-foreground">
              Nenhum histórico disponível.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
