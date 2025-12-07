"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { X, Clock, CreditCard, AlertTriangle } from "lucide-react";
import { differenceInDays } from "date-fns";
import Link from "next/link";

interface CompanyInfo {
  status: "ATIVO" | "PAUSADO" | "PENDENTE" | "EM_TESTE" | "CANCELADO";
  vencimentoPlano: string | null;
  liberacaoTemporariaAte?: string | null;
}

export function TrialBanner() {
  const { data: session } = useSession();
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Não mostrar para master
    if (!session?.user || session.user.role === "master") {
      setLoading(false);
      return;
    }

    // Verificar se foi dismissado nesta sessão
    const dismissedKey = `trial_banner_dismissed_${session.user.empresaId}`;
    if (sessionStorage.getItem(dismissedKey)) {
      setDismissed(true);
      setLoading(false);
      return;
    }

    // Buscar info da empresa
    fetch("/api/company/status")
      .then((res) => res.json())
      .then((data) => {
        if (data.status) {
          setCompanyInfo(data);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [session]);

  const handleDismiss = () => {
    if (session?.user?.empresaId) {
      sessionStorage.setItem(
        `trial_banner_dismissed_${session.user.empresaId}`,
        "true"
      );
    }
    setDismissed(true);
  };

  // Não renderizar em diversas situações
  if (loading || dismissed || !companyInfo) return null;
  if (!session?.user || session.user.role === "master") return null;

  // Lógica de Liberação Temporária
  const isLiberadoTemporariamente =
    companyInfo.status === "PAUSADO" &&
    companyInfo.liberacaoTemporariaAte &&
    new Date(companyInfo.liberacaoTemporariaAte) > new Date();

  // Se não estiver em teste E não estiver liberado temporariamente, não mostra banner (outros status)
  if (companyInfo.status !== "EM_TESTE" && !isLiberadoTemporariamente)
    return null;

  let bannerContent;
  let bgColor;

  if (isLiberadoTemporariamente) {
    bgColor = "bg-gradient-to-r from-red-600 to-orange-600";
    bannerContent = (
      <span>
        <AlertTriangle className="inline-block h-4 w-4 mr-2 mb-0.5" />
        Acesso liberado temporariamente. O sistema será bloqueado em breve se o
        pagamento não compensar.
      </span>
    );
  } else {
    // Calcular dias restantes
    const daysLeft = companyInfo.vencimentoPlano
      ? Math.max(
          0,
          differenceInDays(new Date(companyInfo.vencimentoPlano), new Date())
        )
      : 0;

    // Determinar urgência pela cor
    const isUrgent = daysLeft <= 3;
    bgColor = isUrgent
      ? "bg-gradient-to-r from-orange-500 to-red-500"
      : "bg-gradient-to-r from-yellow-500 to-amber-500";

    bannerContent = (
      <span>
        <Clock className="inline-block h-4 w-4 mr-2 mb-0.5" />
        Período de Teste:{" "}
        <strong>
          {daysLeft === 0
            ? "Último dia!"
            : daysLeft === 1
            ? "1 dia restante"
            : `${daysLeft} dias restantes`}
        </strong>
      </span>
    );
  }

  return (
    <div
      className={`${bgColor} relative flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white shadow-md`}
    >
      {bannerContent}

      {session.user.role === "admin" && companyInfo.status === "EM_TESTE" && (
        <Link
          href="/admin/assinatura"
          className="ml-2 inline-flex items-center gap-1 rounded-md bg-white/20 px-3 py-1 text-xs font-semibold transition-colors hover:bg-white/30"
        >
          <CreditCard className="h-3 w-3" />
          Assinar Agora
        </Link>
      )}

      {session.user.role === "admin" && isLiberadoTemporariamente && (
        <Link
          href="/admin/assinatura"
          className="ml-2 inline-flex items-center gap-1 rounded-md bg-white/20 px-3 py-1 text-xs font-semibold transition-colors hover:bg-white/30"
        >
          <CreditCard className="h-3 w-3" />
          Regularizar
        </Link>
      )}

      <button
        onClick={handleDismiss}
        className="absolute right-2 rounded-full p-1 transition-colors hover:bg-white/20"
        aria-label="Fechar"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
