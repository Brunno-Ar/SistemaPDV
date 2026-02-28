import { useState, useCallback } from "react";

export function useOnboardingTour() {
  const [isActive, setIsActive] = useState(false);
  const [step, setStep] = useState(0);

  const startTour = useCallback(() => {
    setIsActive(true);
    setStep(0);
  }, []);

  const endTour = useCallback(() => {
    setIsActive(false);
    setStep(0);
  }, []);

  const nextStep = useCallback(() => {
    setStep((prev) => prev + 1);
  }, []);

  return {
    isActive,
    step,
    startTour,
    endTour,
    nextStep,
  };
}
