"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Joyride, { CallBackProps, STATUS, Step, ACTIONS } from "react-joyride";
import { useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { TOUR_RESET_EVENT } from "@/lib/events";

const TOUR_COMPLETED_KEY = "flowpdv_tour_completed";
const TOUR_SHOWN_THIS_SESSION_KEY = "flowpdv_tour_shown_session";

export function OnboardingTour() {
  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const { data: session, update, status: sessionStatus } = useSession();
  const pathname = usePathname();
  const router = useRouter();

  const hasInitialized = useRef(false);

  const role = session?.user?.role || "funcionario";
  const userId = session?.user?.id;
  const tourCompletedFromSession = session?.user?.tourCompleted;

  const publicPages = [
    "/login",
    "/forgot-password",
    "/register",
    "/signup",
    "/bloqueado",
  ];
  const isPublicPage = publicPages.some((page) => pathname?.startsWith(page));

  const wasShownThisSession = useCallback(() => {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem(TOUR_SHOWN_THIS_SESSION_KEY) === "true";
  }, []);

  const markShownThisSession = useCallback(() => {
    if (typeof window === "undefined") return;
    sessionStorage.setItem(TOUR_SHOWN_THIS_SESSION_KEY, "true");
  }, []);

  const clearShownThisSession = useCallback(() => {
    if (typeof window === "undefined") return;
    sessionStorage.removeItem(TOUR_SHOWN_THIS_SESSION_KEY);
  }, []);

  const markTourCompletedInStorage = useCallback(() => {
    if (typeof window === "undefined" || !userId) return;
    localStorage.setItem(`${TOUR_COMPLETED_KEY}_${userId}`, "true");
  }, [userId]);

  const isTourCompletedInStorage = useCallback(() => {
    if (typeof window === "undefined" || !userId) return false;
    return localStorage.getItem(`${TOUR_COMPLETED_KEY}_${userId}`) === "true";
  }, [userId]);

  const resetTourInStorage = useCallback(() => {
    if (typeof window === "undefined" || !userId) return;
    localStorage.removeItem(`${TOUR_COMPLETED_KEY}_${userId}`);
  }, [userId]);

  const getDashboardPath = useCallback(() => {
    if (role === "admin") return "/admin";
    if (role === "gerente") return "/gerente";
    return "/dashboard";
  }, [role]);

  // Forçar sidebar a ficar aberto/fechado durante o tour
  const forceSidebarOpen = useCallback((open: boolean) => {
    const sidebar = document.querySelector(
      ".hidden.lg\\:flex .h-full",
    ) as HTMLElement;
    if (!sidebar) return;

    if (open) {
      sidebar.style.width = "300px";
      sidebar.style.pointerEvents = "none";
      sidebar.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
    } else {
      sidebar.style.width = "";
      sidebar.style.pointerEvents = "";
      sidebar.dispatchEvent(new MouseEvent("mouseleave", { bubbles: true }));
    }
  }, []);

  // Quando o tour começa ou para, manipular o sidebar
  useEffect(() => {
    if (run) {
      const timer = setTimeout(() => forceSidebarOpen(true), 200);
      return () => clearTimeout(timer);
    } else {
      forceSidebarOpen(false);
    }
  }, [run, forceSidebarOpen]);

  // Listener para o evento de reset do tour (vindo do botão)
  useEffect(() => {
    const handleTourReset = () => {
      hasInitialized.current = false;
      resetTourInStorage();
      clearShownThisSession();

      const dashPath = getDashboardPath();
      const isOnDashboard = pathname === dashPath;

      if (!isOnDashboard) {
        router.push(dashPath);
      }

      setTimeout(
        () => {
          markShownThisSession();
          setStepIndex(0);
          setRun(true);
        },
        isOnDashboard ? 800 : 1500,
      );
    };

    window.addEventListener(TOUR_RESET_EVENT, handleTourReset);
    return () => window.removeEventListener(TOUR_RESET_EVENT, handleTourReset);
  }, [
    resetTourInStorage,
    clearShownThisSession,
    markShownThisSession,
    getDashboardPath,
    pathname,
    router,
  ]);

  // Lógica principal para decidir quando iniciar o tour
  useEffect(() => {
    if (isPublicPage) {
      setRun(false);
      return;
    }

    if (sessionStatus === "loading") return;

    if (sessionStatus !== "authenticated" || !session?.user) {
      setRun(false);
      return;
    }

    if (role === "master") {
      setRun(false);
      return;
    }

    if (wasShownThisSession()) {
      setRun(false);
      return;
    }

    if (tourCompletedFromSession === true) {
      setRun(false);
      return;
    }

    if (isTourCompletedInStorage()) {
      setRun(false);
      return;
    }

    if (tourCompletedFromSession === false && !hasInitialized.current) {
      hasInitialized.current = true;

      const dashPath = getDashboardPath();
      if (pathname !== dashPath) {
        router.push(dashPath);
      }

      const timer = setTimeout(() => {
        markShownThisSession();
        setStepIndex(0);
        setRun(true);
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [
    tourCompletedFromSession,
    role,
    sessionStatus,
    session?.user,
    isPublicPage,
    wasShownThisSession,
    isTourCompletedInStorage,
    markShownThisSession,
    getDashboardPath,
    pathname,
    router,
  ]);

  if (isPublicPage || sessionStatus !== "authenticated" || !session?.user) {
    return null;
  }

  const handleJoyrideCallback = async (data: CallBackProps) => {
    const { status, action, index, type } = data;
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

    if (type === "step:after" && action === ACTIONS.NEXT) {
      setStepIndex(index + 1);
    } else if (type === "step:after" && action === ACTIONS.PREV) {
      setStepIndex(index - 1);
    }

    if (finishedStatuses.includes(status)) {
      setRun(false);
      setStepIndex(0);
      hasInitialized.current = true;

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
          <h3 className="font-bold text-lg mb-2 text-blue-600">
            Bem-vindo ao FlowPDV! 👋
          </h3>
          <p className="text-sm text-gray-600">
            Vamos te mostrar como dominar o sistema em 4 passos rápidos para
            você começar a vender hoje mesmo.
          </p>
        </div>
      ),
      placement: "center",
      disableBeacon: true,
    },
    {
      target: "#menu-vender",
      content:
        "🛍️ Aqui é o coração da operação: O PDV. Onde suas vendas acontecem de forma rápida e segura.",
      placement: "right",
      disableBeacon: true,
    },
    {
      target: "#menu-estoque",
      content:
        "📦 O Controle de Lotes e Estoque fica aqui. Cadastre produtos para começar a vender.",
      placement: "right",
      disableBeacon: true,
    },
    {
      target: "#menu-relatorios",
      content:
        "📊 Por fim, seus Relatórios Financeiros. Toda sua inteligência de dados em um só lugar.",
      placement: "right",
      disableBeacon: true,
    },
  ];

  const gerenteSteps: Step[] = [
    {
      target: "body",
      content: (
        <div className="text-center">
          <h3 className="font-bold text-lg mb-2 text-blue-600">
            Bem-vindo ao FlowPDV, Gerente! 👋
          </h3>
          <p className="text-sm text-gray-600">
            Descubra as principais ferramentas para gerenciar a loja.
          </p>
        </div>
      ),
      placement: "center",
      disableBeacon: true,
    },
    {
      target: "#menu-vender",
      content: "🛍️ PDV: Acompanhe as vendas ou opere o caixa.",
      placement: "right",
      disableBeacon: true,
    },
    {
      target: "#menu-estoque",
      content: "📦 Estoque: Gerencie os produtos, categorias e lotes da loja.",
      placement: "right",
      disableBeacon: true,
    },
    {
      target: "#menu-movimentacoes",
      content:
        "📉 Movimentações: Acompanhe entradas e saídas do estoque em tempo real.",
      placement: "right",
      disableBeacon: true,
    },
  ];

  const funcionarioSteps: Step[] = [
    {
      target: "body",
      content: (
        <div className="text-center">
          <h3 className="font-bold text-lg mb-2 text-blue-600">
            Bem-vindo ao FlowPDV! 👋
          </h3>
          <p className="text-sm text-gray-600">
            Vamos conhecer seu ambiente de trabalho.
          </p>
        </div>
      ),
      placement: "center",
      disableBeacon: true,
    },
    {
      target: "#menu-vender",
      content:
        "🛍️ PDV: Acesse o caixa para realizar vendas. É super rápido e intuitivo!",
      placement: "right",
      disableBeacon: true,
    },
    {
      target: "#menu-minha-conta",
      content:
        "👤 Minha Conta: Gerencie seus dados e veja suas próprias vendas.",
      placement: "right",
      disableBeacon: true,
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
      stepIndex={stepIndex}
      continuous
      showSkipButton
      showProgress
      scrollToFirstStep={false}
      disableScrollParentFix={true}
      spotlightClicks={false}
      disableOverlayClose={true}
      callback={handleJoyrideCallback}
      floaterProps={{
        disableAnimation: true,
      }}
      styles={{
        options: {
          primaryColor: "#137fec",
          zIndex: 10000,
          arrowColor: "#fff",
          backgroundColor: "#fff",
          overlayColor: "rgba(0, 0, 0, 0.5)",
          textColor: "#333",
        },
        overlay: {
          zIndex: 9999,
        },
        spotlight: {
          borderRadius: "12px",
        },
        tooltip: {
          borderRadius: "16px",
          boxShadow:
            "0 20px 40px -5px rgba(0, 0, 0, 0.15), 0 10px 15px -5px rgba(0, 0, 0, 0.1)",
          padding: "24px",
        },
        tooltipContainer: {
          textAlign: "left",
        },
        buttonNext: {
          backgroundColor: "#137fec",
          borderRadius: "10px",
          padding: "10px 24px",
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
