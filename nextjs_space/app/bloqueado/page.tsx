"use client";

import { useEffect, useState, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  CreditCard,
  Phone,
  Mail,
  ExternalLink,
  Loader2,
  Lock,
  ShieldAlert,
  Clock,
  CheckCircle2,
  XCircle,
  ServerCrash,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface BillingInfo {
  value: number;
  invoiceUrl: string;
  status: string;
  vencimento: string;
}

function BloqueadoContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const email = searchParams.get("email");
  const reason = searchParams.get("reason") || "vencido";
  const role = searchParams.get("role") || "employee";

  const isAdmin = role === "admin";

  const [billing, setBilling] = useState<BillingInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [unlockPassword, setUnlockPassword] = useState("");
  const [unlocking, setUnlocking] = useState(false);
  const [unlockError, setUnlockError] = useState("");
  const [unlockSuccess, setUnlockSuccess] = useState(false);

  useEffect(() => {
    if (email && isAdmin) {
      fetch(`/api/billing/pending?email=${encodeURIComponent(email)}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.billing) {
            setBilling(data.billing);
          }
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [email, isAdmin]);

  const handleUnlock = async () => {
    setUnlocking(true);
    setUnlockError("");
    try {
      const res = await fetch("/api/public/unlock-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: unlockPassword }),
      });
      const data = await res.json();

      if (res.ok) {
        setUnlockSuccess(true);
        setTimeout(() => {
          setShowUnlockModal(false);
          router.push("/login?message=desbloqueado");
        }, 2000);
      } else {
        setUnlockError(data.error || "Erro ao desbloquear");
      }
    } catch {
      setUnlockError("Erro de conexão ao tentar desbloquear");
    } finally {
      setUnlocking(false);
    }
  };

  // =============================================
  // TELA DO FUNCIONÁRIO (caixa/gerente) - NEUTRA
  // =============================================
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950 flex flex-col items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="max-w-md w-full"
        >
          <div className="flex items-center justify-center gap-2 mb-8">
            <Image
              src="/logo.png"
              alt="FlowPDV"
              width={40}
              height={40}
              className="h-10 w-10 rounded-lg"
            />
            <span className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
              FlowPDV
            </span>
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-gray-200 dark:border-zinc-800 overflow-hidden">
            <div className="p-8 text-center bg-gradient-to-br from-slate-50 to-gray-100 dark:from-zinc-800/50 dark:to-zinc-900">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-5 bg-slate-100 dark:bg-zinc-800 border-2 border-slate-200 dark:border-zinc-700"
              >
                <ServerCrash className="w-10 h-10 text-slate-500 dark:text-slate-400" />
              </motion.div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                Sistema Temporariamente Indisponível
              </h1>
              <p className="text-gray-500 dark:text-gray-400 leading-relaxed">
                O sistema está passando por uma manutenção programada. Pedimos
                desculpas pelo inconveniente.
              </p>
            </div>

            <div className="p-6 space-y-5">
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-100 dark:border-blue-800/30">
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
                      O que fazer?
                    </p>
                    <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                      Entre em contato com o administrador da sua empresa para
                      verificar o painel de configurações.
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 dark:border-zinc-700 pt-5">
                <p className="text-xs text-center text-gray-400 dark:text-gray-500">
                  Se o problema persistir, entre em contato com o suporte
                  técnico.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 text-center">
            <Link
              href="/login"
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              ← Voltar para o login
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  // =============================================
  // TELA DO ADMIN - COM INFORMAÇÕES FINANCEIRAS
  // =============================================
  const getReasonContent = () => {
    switch (reason) {
      case "pendente":
        return {
          title: "Cadastro em Análise",
          subtitle: "Sua empresa está aguardando aprovação.",
          description:
            "Nosso time está analisando seu cadastro. Você será notificado por email assim que for aprovado.",
          icon: Clock,
          gradient: "from-amber-500 to-yellow-600",
          bgLight: "bg-amber-50 dark:bg-amber-900/20",
          borderLight: "border-amber-100 dark:border-amber-800/30",
          showBilling: false,
          showUnlock: false,
        };
      case "cancelado":
        return {
          title: "Conta Cancelada",
          subtitle: "Sua assinatura foi encerrada.",
          description:
            "Sua empresa teve a assinatura cancelada. Entre em contato com nosso suporte para reativar seu acesso.",
          icon: XCircle,
          gradient: "from-red-500 to-rose-600",
          bgLight: "bg-red-50 dark:bg-red-900/20",
          borderLight: "border-red-100 dark:border-red-800/30",
          showBilling: false,
          showUnlock: false,
        };
      case "pausado":
        return {
          title: "Acesso Suspenso",
          subtitle: "Pagamento não identificado.",
          description:
            "Regularize sua situação para voltar a usar o sistema. Utilize qualquer forma de pagamento disponível.",
          icon: ShieldAlert,
          gradient: "from-red-500 to-orange-600",
          bgLight: "bg-red-50 dark:bg-red-900/20",
          borderLight: "border-red-100 dark:border-red-800/30",
          showBilling: true,
          showUnlock: true,
        };
      default:
        return {
          title: "Plano Vencido",
          subtitle: "Sua mensalidade está em atraso.",
          description:
            "Renove seu plano para continuar usando o FlowPDV. Utilize qualquer forma de pagamento disponível.",
          icon: AlertTriangle,
          gradient: "from-orange-500 to-amber-600",
          bgLight: "bg-orange-50 dark:bg-orange-900/20",
          borderLight: "border-orange-100 dark:border-orange-800/30",
          showBilling: true,
          showUnlock: true,
        };
    }
  };

  const content = getReasonContent();
  const Icon = content.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-slate-50 to-gray-100 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950 flex flex-col items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="max-w-md w-full"
      >
        <div className="flex items-center justify-center gap-2 mb-8">
          <Image
            src="/logo.png"
            alt="FlowPDV"
            width={40}
            height={40}
            className="h-10 w-10 rounded-lg"
          />
          <span className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            FlowPDV
          </span>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-gray-200 dark:border-zinc-800 overflow-hidden">
          {/* Header com Gradiente */}
          <div className={`relative p-8 text-center overflow-hidden`}>
            <div
              className={`absolute inset-0 bg-gradient-to-r ${content.gradient} opacity-10`}
            />
            <div className="relative z-10">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className={`inline-flex items-center justify-center w-20 h-20 rounded-full mb-5 ${content.bgLight} border-2 ${content.borderLight}`}
              >
                <Icon
                  className="w-10 h-10 text-current opacity-80"
                  style={{
                    color:
                      reason === "pendente"
                        ? "#d97706"
                        : reason === "cancelado"
                          ? "#dc2626"
                          : reason === "pausado"
                            ? "#dc2626"
                            : "#ea580c",
                  }}
                />
              </motion.div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {content.title}
              </h1>
              <p className="text-gray-500 dark:text-gray-400">
                {content.subtitle}
              </p>
            </div>
          </div>

          {/* Corpo */}
          <div className="p-6 space-y-5">
            <p className="text-center text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
              {content.description}
            </p>

            {/* Fatura Pendente (apenas admin) */}
            {content.showBilling && (
              <>
                {loading ? (
                  <div className="flex justify-center py-6">
                    <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                  </div>
                ) : billing ? (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-gray-50 dark:bg-zinc-800 rounded-xl p-5 space-y-4 border border-gray-100 dark:border-zinc-700"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        Valor Pendente
                      </span>
                      <span className="text-2xl font-bold text-gray-900 dark:text-white">
                        {new Intl.NumberFormat("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        }).format(billing.value)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        Vencimento
                      </span>
                      <span className="text-sm font-semibold text-red-600 dark:text-red-400">
                        {billing.vencimento}
                      </span>
                    </div>

                    <div className="pt-2 space-y-3">
                      <Button
                        asChild
                        className="w-full h-12 text-base font-semibold bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg shadow-blue-500/20"
                      >
                        <a
                          href={billing.invoiceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <CreditCard className="mr-2 h-5 w-5" />
                          Pagar Agora
                          <ExternalLink className="ml-2 h-4 w-4" />
                        </a>
                      </Button>

                      <p className="text-xs text-center text-gray-400 dark:text-gray-500">
                        PIX • Boleto • Cartão de Crédito
                      </p>
                    </div>
                  </motion.div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Entre em contato com o suporte para atualizar seu
                      pagamento.
                    </p>
                  </div>
                )}

                {content.showUnlock && (
                  <Button
                    variant="outline"
                    className="w-full h-12 text-base font-medium border-dashed"
                    onClick={() => setShowUnlockModal(true)}
                  >
                    <Lock className="mr-2 h-4 w-4" />
                    Já paguei, liberar acesso temporário
                  </Button>
                )}
              </>
            )}

            {/* Contato Suporte */}
            <div className="border-t border-gray-200 dark:border-zinc-700 pt-5 space-y-3">
              <p className="text-sm text-center text-gray-500 dark:text-gray-400 mb-3">
                Precisa de ajuda?
              </p>
              <div className="flex gap-3">
                <a
                  href="https://wa.me/5511999999999"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1"
                >
                  <Button variant="outline" className="w-full h-11">
                    <Phone className="mr-2 h-4 w-4" />
                    WhatsApp
                  </Button>
                </a>
                <a href="mailto:suporte@flowpdv.com" className="flex-1">
                  <Button variant="outline" className="w-full h-11">
                    <Mail className="mr-2 h-4 w-4" />
                    Email
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center">
          <Link
            href="/login"
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            ← Voltar para o login
          </Link>
        </div>
      </motion.div>

      {/* Modal de Desbloqueio Temporário */}
      <Dialog open={showUnlockModal} onOpenChange={setShowUnlockModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-blue-600" />
              Liberação Temporária
            </DialogTitle>
            <DialogDescription>
              Se você já realizou o pagamento, podemos liberar seu acesso por{" "}
              <strong>24 horas</strong> enquanto a compensação é processada.
              <br />
              <br />
              Confirme sua senha para continuar.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="unlock-password">Senha</Label>
              <Input
                id="unlock-password"
                type="password"
                placeholder="Sua senha de acesso"
                value={unlockPassword}
                onChange={(e) => setUnlockPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && unlockPassword && !unlocking) {
                    handleUnlock();
                  }
                }}
              />
            </div>
            <AnimatePresence mode="wait">
              {unlockError && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg border border-red-200 dark:border-red-800/30 flex items-center gap-2"
                >
                  <XCircle className="h-4 w-4 flex-shrink-0" />
                  {unlockError}
                </motion.div>
              )}
              {unlockSuccess && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="p-3 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-sm rounded-lg border border-green-200 dark:border-green-800/30 flex items-center gap-2"
                >
                  <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                  Acesso liberado! Redirecionando...
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowUnlockModal(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleUnlock}
              disabled={unlocking || !unlockPassword || unlockSuccess}
            >
              {unlocking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar Liberação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function BloqueadoPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-zinc-950">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      }
    >
      <BloqueadoContent />
    </Suspense>
  );
}
