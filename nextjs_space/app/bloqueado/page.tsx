"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  CreditCard,
  Phone,
  Mail,
  ExternalLink,
  Loader2,
  Lock,
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

export default function BloqueadoPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const email = searchParams.get("email");
  const reason = searchParams.get("reason") || "vencido";

  const [billing, setBilling] = useState<BillingInfo | null>(null);
  const [loading, setLoading] = useState(true);

  // States para modal de desbloqueio
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [unlockPassword, setUnlockPassword] = useState("");
  const [unlocking, setUnlocking] = useState(false);
  const [unlockError, setUnlockError] = useState("");

  useEffect(() => {
    // Buscar informações de pagamento se tiver email
    if (email) {
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
  }, [email]);

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
        setShowUnlockModal(false);
        router.push("/login?message=desbloqueado");
      } else {
        setUnlockError(data.error || "Erro ao desbloquear");
      }
    } catch (error) {
      setUnlockError("Erro de conexão ao tentar desbloquear");
    } finally {
      setUnlocking(false);
    }
  };

  const getReasonContent = () => {
    switch (reason) {
      case "pendente":
        return {
          title: "Cadastro em Análise",
          subtitle: "Sua empresa está aguardando aprovação.",
          description:
            "Nosso time está analisando seu cadastro. Você será notificado por email assim que for aprovado.",
          color: "yellow",
          showUnlock: false,
        };
      case "pausado":
        return {
          title: "Acesso Suspenso",
          subtitle: "Pagamento não identificado.",
          description: "Regularize sua situação para voltar a usar o sistema.",
          color: "red",
          showUnlock: true,
        };
      default:
        return {
          title: "Plano Vencido",
          subtitle: "Sua mensalidade está em atraso.",
          description: "Renove seu plano para continuar usando o FlowPDV.",
          color: "orange",
          showUnlock: true,
        };
    }
  };

  const content = getReasonContent();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-zinc-950 dark:to-zinc-900 flex flex-col items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full"
      >
        {/* Logo */}
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

        {/* Card Principal */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-gray-200 dark:border-zinc-800 overflow-hidden">
          {/* Header com Status */}
          <div
            className={`p-6 text-center ${
              content.color === "red"
                ? "bg-red-50 dark:bg-red-900/20"
                : content.color === "yellow"
                  ? "bg-yellow-50 dark:bg-yellow-900/20"
                  : "bg-orange-50 dark:bg-orange-900/20"
            }`}
          >
            <div
              className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 ${
                content.color === "red"
                  ? "bg-red-100 dark:bg-red-900/40"
                  : content.color === "yellow"
                    ? "bg-yellow-100 dark:bg-yellow-900/40"
                    : "bg-orange-100 dark:bg-orange-900/40"
              }`}
            >
              <AlertTriangle
                className={`w-8 h-8 ${
                  content.color === "red"
                    ? "text-red-600"
                    : content.color === "yellow"
                      ? "text-yellow-600"
                      : "text-orange-600"
                }`}
              />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {content.title}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {content.subtitle}
            </p>
          </div>

          {/* Corpo */}
          <div className="p-6 space-y-6">
            <p className="text-center text-gray-600 dark:text-gray-400">
              {content.description}
            </p>

            {/* Fatura Pendente */}
            {loading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : billing ? (
              <div className="bg-gray-50 dark:bg-zinc-800 rounded-xl p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    Valor Pendente
                  </span>
                  <span className="text-xl font-bold text-gray-900 dark:text-white">
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
                  <span className="text-sm font-medium text-red-600">
                    {billing.vencimento}
                  </span>
                </div>
                <Button asChild className="w-full h-12 text-base font-semibold">
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

                {content.showUnlock && (
                  <Button
                    variant="outline"
                    className="w-full h-12 text-base font-medium mt-2"
                    onClick={() => setShowUnlockModal(true)}
                  >
                    <Lock className="mr-2 h-4 w-4" />
                    Já paguei, liberar acesso
                  </Button>
                )}
              </div>
            ) : (
              reason !== "pendente" && (
                <div className="space-y-4">
                  <div className="text-center text-sm text-gray-500 dark:text-gray-400">
                    Entre em contato com o suporte para atualizar seu pagamento
                    ou tente liberar o acesso temporário se já efetuou o
                    pagamento.
                  </div>
                  {content.showUnlock && (
                    <Button
                      variant="outline"
                      className="w-full h-12 text-base font-medium mt-2"
                      onClick={() => setShowUnlockModal(true)}
                    >
                      <Lock className="mr-2 h-4 w-4" />
                      Já paguei, liberar acesso
                    </Button>
                  )}
                </div>
              )
            )}

            {/* Contato Suporte */}
            <div className="border-t border-gray-200 dark:border-zinc-700 pt-6 space-y-3">
              <p className="text-sm text-center text-gray-500 dark:text-gray-400 mb-4">
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

        {/* Link para Login */}
        <div className="mt-6 text-center">
          <Link
            href="/login"
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            ← Voltar para o login
          </Link>
        </div>
      </motion.div>

      <Dialog open={showUnlockModal} onOpenChange={setShowUnlockModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Liberar Acesso Temporário</DialogTitle>
            <DialogDescription>
              Se você já realizou o pagamento, podemos liberar seu acesso por 24
              horas enquanto a compensação é processada pelo banco. <br />
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
              />
            </div>
            {unlockError && (
              <div className="p-3 bg-red-50 text-red-600 text-sm rounded-md border border-red-200">
                {unlockError}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowUnlockModal(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleUnlock}
              disabled={unlocking || !unlockPassword}
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
