import React from "react";
import styles from "./styles.module.css";
import { useOnboardingTour } from "./hooks";

export function OnboardingTourFeature() {
  const { isActive, step } = useOnboardingTour();

  return (
    <div className={styles.container}>
      {/* Placeholder para a nova lógica do tour interativo */}
      <h2>Onboarding Tour Feature Placeholder</h2>
      <p>Active: {isActive ? "Yes" : "No"}</p>
      <p>Current Step: {step}</p>
    </div>
  );
}
