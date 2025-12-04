"use client";

import { useEffect, useState } from "react";
import Joyride, { CallBackProps, STATUS, Step } from "react-joyride";
import { useSession } from "next-auth/react";

interface OnboardingTourProps {
  role: string;
  tourCompleted: boolean;
}

export function OnboardingTour({ role, tourCompleted }: OnboardingTourProps) {
  const [run, setRun] = useState(false);
  const { update } = useSession();

  useEffect(() => {
    // Only run if not completed and role is not master
    if (!tourCompleted && role !== "master") {
      // Small delay to ensure DOM is fully ready and hydration is complete
      const timer = setTimeout(() => {
        setRun(true);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [tourCompleted, role]);

  const handleJoyrideCallback = async (data: CallBackProps) => {
    const { status } = data;
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

    if (finishedStatuses.includes(status)) {
      setRun(false);
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
          boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
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
