import { useState } from "react";

export function usePlanos() {
  const [loading, setLoading] = useState(false);

  const updatePrice = async (planId: string, newPrice: number) => {
    setLoading(true);
    // TODO: implement call to Asaas
    setLoading(false);
  };

  return {
    loading,
    updatePrice,
  };
}
