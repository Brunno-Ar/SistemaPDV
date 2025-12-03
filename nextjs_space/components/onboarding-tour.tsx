"use client";

import { useEffect, useState } from "react";
import Joyride, { CallBackProps, STATUS, Step } from "react-joyride";

interface OnboardingTourProps {
  role: string;
  tourCompleted: boolean;
}

export function OnboardingTour({ role, tourCompleted }: OnboardingTourProps) {
  const [run, setRun] = useState(false);

  useEffect(() => {
    // Only run if not completed and role is not master
    if (!tourCompleted && role !== "master") {
      setRun(true);
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
      } catch (error) {
        console.error("Failed to complete tour", error);
      }
    }
  };

  const adminSteps: Step[] = [
    {
      target: "body",
      content: "Bem-vindo ao FlowPDV! Vamos fazer um tour rápido pelas funcionalidades.",
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

  const funcionarioSteps: Step[] = [
    {
      target: "body",
      content: "Bem-vindo ao FlowPDV! Vamos conhecer seu ambiente de trabalho.",
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

  if (role === "admin" || role === "gerente") {
    steps = adminSteps;
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
        },
        buttonNext: {
          backgroundColor: "#137fec",
        },
        buttonBack: {
          color: "#137fec",
        },
      }}
      locale={{
        back: "Voltar",
        close: "Fechar",
        last: "Terminar",
        next: "Próximo",
        skip: "Pular",
      }}
    />
  );
}
