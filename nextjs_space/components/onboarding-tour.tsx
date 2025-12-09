"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Joyride, { CallBackProps, STATUS, Step } from "react-joyride";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { TOUR_RESET_EVENT } from "@/lib/events";

const TOUR_COMPLETED_KEY = "flowpdv_tour_completed";

export function OnboardingTour() {
  const [run, setRun] = useState(false);
  const { data: session, update, status: sessionStatus } = useSession();
  const pathname = usePathname();

  // Use ref para controlar se o tour já foi iniciado nesta sessão
  const hasInitialized = useRef(false);

  // Obter valores diretamente da sessão cliente
  const role = session?.user?.role || "funcionario";
  const tourCompletedFromSession = session?.user?.tourCompleted;

  // Verificar localStorage como backup (para evitar flash durante carregamento)
  const getTourCompletedFromStorage = useCallback(() => {
    if (typeof window === "undefined") return true;
    const userId = session?.user?.id;
    if (!userId) return true; // Se não tem userId, assume completado
    const stored = localStorage.getItem(`${TOUR_COMPLETED_KEY}_${userId}`);
    return stored === "true";
  }, [session?.user?.id]);

  // Combina sessão + localStorage para determinar se tour foi completado
  // Se qualquer um disser "completado", não mostra o tour
  const tourCompleted =
    tourCompletedFromSession || getTourCompletedFromStorage();

  // Bloqueio imediato de renderização em páginas públicas
  const publicPages = [
    "/login",
    "/forgot-password",
    "/register",
    "/signup",
    "/bloqueado",
  ];
  const isPublicPage = publicPages.some((page) => pathname?.startsWith(page));

  // Função para marcar tour como completado no localStorage
  const markTourCompletedInStorage = useCallback(() => {
    if (typeof window === "undefined") return;
    const userId = session?.user?.id;
    if (userId) {
      localStorage.setItem(`${TOUR_COMPLETED_KEY}_${userId}`, "true");
    }
  }, [session?.user?.id]);

  // Função para resetar tour no localStorage
  const resetTourInStorage = useCallback(() => {
    if (typeof window === "undefined") return;
    const userId = session?.user?.id;
    if (userId) {
      localStorage.removeItem(`${TOUR_COMPLETED_KEY}_${userId}`);
    }
  }, [session?.user?.id]);

  // Função para iniciar o tour
  const startTour = useCallback(() => {
    if (
      role !== "master" &&
      sessionStatus === "authenticated" &&
      session?.user
    ) {
      console.log("Iniciando tour...");
      setRun(true);
    }
  }, [role, sessionStatus, session?.user]);

  // Listener para o evento de reset do tour (vindo do botão)
  useEffect(() => {
    const handleTourReset = () => {
      console.log("Tour reset event received");
      hasInitialized.current = false;
      resetTourInStorage();
      // Pequeno delay para garantir que a sessão foi atualizada
      setTimeout(() => {
        startTour();
      }, 500);
    };

    window.addEventListener(TOUR_RESET_EVENT, handleTourReset);
    return () => window.removeEventListener(TOUR_RESET_EVENT, handleTourReset);
  }, [startTour, resetTourInStorage]);

  // Lógica principal para decidir quando iniciar o tour
  useEffect(() => {
    // NUNCA rodar em páginas públicas ou enquanto carregando
    if (isPublicPage || sessionStatus === "loading") {
      setRun(false);
      return;
    }

    // Só executa se o usuário estiver autenticado
    if (sessionStatus !== "authenticated" || !session?.user) {
      setRun(false);
      return;
    }

    // Se é master, não iniciar
    if (role === "master") {
      setRun(false);
      return;
    }

    // Se o tour já foi completado (sessão OU localStorage), não iniciar
    if (tourCompleted) {
      setRun(false);
      return;
    }

    // Iniciar o tour apenas na primeira vez se não está completado
    if (!hasInitialized.current && !tourCompleted) {
      hasInitialized.current = true;

      // Delay para garantir que o DOM está pronto
      const timer = setTimeout(() => {
        console.log("Iniciando tour (inicial)...", { role, tourCompleted });
        setRun(true);
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [tourCompleted, role, sessionStatus, session?.user, isPublicPage]);

  // Não renderizar em páginas públicas ou enquanto carregando sessão
  if (isPublicPage || sessionStatus !== "authenticated" || !session?.user) {
    return null;
  }

  const handleJoyrideCallback = async (data: CallBackProps) => {
    const { status } = data;
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

    if (finishedStatuses.includes(status)) {
      setRun(false);
      hasInitialized.current = true; // Marcar como inicializado para evitar re-trigger

      // Salvar no localStorage IMEDIATAMENTE para evitar re-aparição no F5
      markTourCompletedInStorage();

      try {
        await fetch("/api/user/complete-tour", {
          method: "POST",
        });
        await update({ tourCompleted: true });
      } catch (error) {
        console.error("Failed to complete tour", error);
      }
    }
  };

  const adminSteps: Step[] = [
    {
      target: "body",
      content: (
        <div className="text-center">
          <h3 className="font-bold text-lg mb-2">Bem-vindo ao FlowPDV!</h3>
          <p>Vamos fazer um tour rápido pelas funcionalidades do sistema.</p>
        </div>
      ),
      placement: "center",
      disableBeacon: true,
    },
    {
      target: "#menu-vender",
      content: "Aqui você realiza as vendas no PDV (Ponto de Venda).",
    },
    {
      target: "#menu-estoque",
      content: "Gerencie seus produtos e estoque nesta área.",
    },
    {
      target: "#menu-movimentacoes",
      content: "Acompanhe todas as movimentações de estoque e financeiras.",
    },
    {
      target: "#menu-equipe",
      content: "Gerencie os membros da sua equipe e permissões.",
    },
    {
      target: "#menu-relatorios",
      content: "Visualize relatórios detalhados de vendas e financeiro.",
    },
    {
      target: "#card-faturamento",
      content: "Acompanhe seu faturamento diário aqui.",
    },
  ];

  const gerenteSteps: Step[] = [
    {
      target: "body",
      content: (
        <div className="text-center">
          <h3 className="font-bold text-lg mb-2">Bem-vindo ao FlowPDV!</h3>
          <p>Vamos fazer um tour rápido pelas funcionalidades do sistema.</p>
        </div>
      ),
      placement: "center",
      disableBeacon: true,
    },
    {
      target: "#menu-vender",
      content: "Aqui você realiza as vendas no PDV (Ponto de Venda).",
    },
    {
      target: "#menu-estoque",
      content: "Gerencie seus produtos e estoque nesta área.",
    },
    {
      target: "#menu-movimentacoes",
      content: "Acompanhe as movimentações de estoque e financeiras.",
    },
    {
      target: "#card-faturamento",
      content: "Acompanhe seu faturamento diário aqui.",
    },
  ];

  const funcionarioSteps: Step[] = [
    {
      target: "body",
      content: (
        <div className="text-center">
          <h3 className="font-bold text-lg mb-2">Bem-vindo ao FlowPDV!</h3>
          <p>Vamos conhecer seu ambiente de trabalho.</p>
        </div>
      ),
      placement: "center",
      disableBeacon: true,
    },
    {
      target: "#menu-vender",
      content: "Acesse o caixa para realizar vendas.",
    },
    {
      target: "#mural-avisos",
      content: "Fique atento aos avisos e comunicados da empresa aqui.",
    },
    {
      target: "#menu-minha-conta",
      content: "Gerencie seus dados e veja suas vendas.",
    },
  ];

  let steps: Step[] = [];

  if (role === "admin") {
    steps = adminSteps;
  } else if (role === "gerente") {
    steps = gerenteSteps;
  } else if (role === "caixa" || role === "funcionario") {
    steps = funcionarioSteps;
  }

  if (!steps.length) return null;

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous
      showSkipButton
      showProgress
      scrollToFirstStep={false}
      disableScrollParentFix={true}
      spotlightClicks={true}
      callback={handleJoyrideCallback}
      styles={{
        options: {
          primaryColor: "#137fec",
          zIndex: 1000,
          arrowColor: "#fff",
          backgroundColor: "#fff",
          overlayColor: "rgba(0, 0, 0, 0.6)",
          textColor: "#333",
        },
        tooltip: {
          borderRadius: "12px",
          boxShadow:
            "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
          padding: "20px",
        },
        tooltipContainer: {
          textAlign: "left",
        },
        buttonNext: {
          backgroundColor: "#137fec",
          borderRadius: "8px",
          padding: "10px 20px",
          fontWeight: 600,
          fontSize: "14px",
        },
        buttonBack: {
          color: "#666",
          marginRight: "10px",
          fontWeight: 500,
        },
        buttonSkip: {
          color: "#999",
          fontSize: "14px",
        },
      }}
      locale={{
        back: "Voltar",
        close: "Fechar",
        last: "Concluir",
        next: "Próximo",
        skip: "Pular tour",
      }}
    />
  );
}
