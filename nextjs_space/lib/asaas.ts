// Define environment variables with fallbacks for type safety
const ASAAS_API_URL =
  process.env.ASAAS_API_URL || "https://sandbox.asaas.com/api/v3";

// Para produção, use variáveis de ambiente
const ASAAS_API_KEY =
  process.env.ASAAS_API_KEY ||
  "$aact_hmlg_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6OmJlODAyMDc1LTFjNTEtNDA5NC05N2ZkLTUxYWRmNjg4ODA0Njo6JGFhY2hfZjA3MzllMjgtNWE2MC00NjM4LWI1NDctNThmMWIxNDliNTg4";

const PLAN_PRICE = parseFloat(process.env.NEXT_PUBLIC_PLAN_PRICE || "49.90");
const TRIAL_DAYS = parseInt(process.env.NEXT_PUBLIC_TRIAL_DAYS || "14", 10);

// Multa e Juros configuráveis
const FINE_PERCENT = parseFloat(process.env.ASAAS_FINE_PERCENT || "2"); // 2%
const INTEREST_PERCENT = parseFloat(process.env.ASAAS_INTEREST_PERCENT || "1"); // 1% a.m.

console.log(
  "ASAAS_API_KEY loaded:",
  ASAAS_API_KEY ? "***" + ASAAS_API_KEY.slice(-10) : "EMPTY"
);

if (!ASAAS_API_KEY) {
  console.warn("⚠️ ASAAS_API_KEY is not defined. Integration calls will fail.");
}

interface AsaasCustomer {
  id: string;
  name: string;
  email: string;
  cpfCnpj: string;
  address?: string;
  addressNumber?: string;
  complement?: string;
  province?: string;
  postalCode?: string;
}

interface AsaasSubscription {
  id: string;
  customerId: string;
  value: number;
  nextDueDate: string;
  cycle: string;
  status: string;
}

interface BillingInfo {
  value: number;
  dueDate: string;
  invoiceUrl: string;
  bankSlipUrl?: string;
  pixQrCodeUrl?: string;
  status?: string;
}

interface AsaasError {
  errors?: { description: string; code: string }[];
}

/**
 * Helper function for consistent error logging
 */
function logError(
  method: string,
  error: unknown,
  context?: Record<string, unknown>
) {
  console.error(`❌ [Asaas.${method}] Error:`, {
    message: error instanceof Error ? error.message : String(error),
    context,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Helper function for API requests
 */
async function asaasRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ ok: boolean; data: T; status: number }> {
  const url = `${ASAAS_API_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      access_token: ASAAS_API_KEY,
      ...options.headers,
    },
  });

  // Handle 204 No Content
  if (response.status === 204) {
    return { ok: true, data: {} as T, status: 204 };
  }

  const text = await response.text();
  let data: T;

  try {
    data = JSON.parse(text);
  } catch {
    console.error("[Asaas] Invalid JSON response:", text);
    throw new Error(`Resposta inválida do Asaas (status ${response.status})`);
  }

  return { ok: response.ok, data, status: response.status };
}

export const asaas = {
  /**
   * Searches for existing customer by CPF/CNPJ
   */
  async findCustomerByCpfCnpj(cpfCnpj: string): Promise<AsaasCustomer | null> {
    try {
      const { ok, data } = await asaasRequest<{ data: AsaasCustomer[] }>(
        `/customers?cpfCnpj=${encodeURIComponent(cpfCnpj)}`
      );

      if (ok && data.data && data.data.length > 0) {
        console.log(
          "✅ [Asaas.findCustomerByCpfCnpj] Customer found:",
          data.data[0].id
        );
        return data.data[0];
      }

      return null;
    } catch (error) {
      logError("findCustomerByCpfCnpj", error, { cpfCnpj });
      return null;
    }
  },

  /**
   * Updates an existing customer in Asaas
   */
  async updateCustomer(
    customerId: string,
    updates: { name?: string; email?: string; mobilePhone?: string }
  ): Promise<AsaasCustomer> {
    console.log("📝 [Asaas.updateCustomer] Updating:", customerId);

    const { ok, data } = await asaasRequest<AsaasCustomer & AsaasError>(
      `/customers/${customerId}`,
      {
        method: "POST",
        body: JSON.stringify(updates),
      }
    );

    if (!ok) {
      const errorMsg =
        data.errors?.[0]?.description || "Erro ao atualizar cliente no Asaas";
      logError("updateCustomer", errorMsg, { customerId, updates });
      throw new Error(errorMsg);
    }

    console.log("✅ [Asaas.updateCustomer] Customer updated:", data.id);
    return data;
  },

  /**
   * Creates a new customer in Asaas.
   * If CPF/CNPJ already exists, updates and returns existing customer.
   */
  async createCustomer(
    name: string,
    cpfCnpj: string,
    email: string,
    mobilePhone?: string,
    addressData?: {
      logradouro: string;
      numero: string;
      bairro: string;
      cep: string;
      complemento?: string;
    }
  ): Promise<AsaasCustomer> {
    if (!cpfCnpj) throw new Error("CPF/CNPJ é obrigatório");

    console.log("🔄 [Asaas.createCustomer] Checking if customer exists...");

    // Verificar se cliente já existe
    const existingCustomer = await this.findCustomerByCpfCnpj(cpfCnpj);

    if (existingCustomer) {
      console.log("ℹ️ [Asaas.createCustomer] Customer exists, updating...");
      // Opcional: Atualizar endereço também se fornecido
      return this.updateCustomer(existingCustomer.id, {
        name,
        email,
        mobilePhone,
      });
    }

    console.log("🆕 [Asaas.createCustomer] Creating new customer:", {
      name,
      cpfCnpj,
      email,
    });

    const payload: any = {
      name,
      cpfCnpj,
      email,
      mobilePhone,
      notificationDisabled: false,
    };

    if (addressData) {
      payload.address = addressData.logradouro;
      payload.addressNumber = addressData.numero;
      payload.complement = addressData.complemento;
      payload.province = addressData.bairro;
      payload.postalCode = addressData.cep;
    }

    const { ok, data } = await asaasRequest<AsaasCustomer & AsaasError>(
      "/customers",
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );

    if (!ok) {
      const errorMsg =
        data.errors?.[0]?.description || "Erro ao criar cliente no Asaas";
      logError("createCustomer", errorMsg, { name, cpfCnpj, email });
      throw new Error(errorMsg);
    }

    console.log("✅ [Asaas.createCustomer] Customer created:", data.id);
    return {
      id: data.id,
      name: data.name,
      email: data.email,
      cpfCnpj: data.cpfCnpj,
    };
  },

  /**
   * Gets customer details from Asaas.
   */
  async getCustomer(customerId: string): Promise<AsaasCustomer> {
    console.log("🔍 [Asaas.getCustomer]", customerId);

    const { ok, data } = await asaasRequest<AsaasCustomer & AsaasError>(
      `/customers/${customerId}`
    );

    if (!ok) {
      const errorMsg =
        data.errors?.[0]?.description || "Erro ao buscar cliente";
      logError("getCustomer", errorMsg, { customerId });
      throw new Error(errorMsg);
    }

    return data;
  },

  /**
   * Creates a subscription with fine and interest rules.
   * Starts after the trial period.
   */
  async createSubscription(
    customerId: string,
    customValue?: number
  ): Promise<AsaasSubscription> {
    const nextDueDate = new Date();
    nextDueDate.setDate(nextDueDate.getDate() + TRIAL_DAYS);
    const nextDueDateStr = nextDueDate.toISOString().split("T")[0];

    const value = customValue !== undefined ? customValue : PLAN_PRICE;

    console.log("🔄 [Asaas.createSubscription] Creating subscription:", {
      customerId,
      value,
      nextDueDate: nextDueDateStr,
      fine: `${FINE_PERCENT}%`,
      interest: `${INTEREST_PERCENT}% a.m.`,
    });

    const { ok, data } = await asaasRequest<AsaasSubscription & AsaasError>(
      "/subscriptions",
      {
        method: "POST",
        body: JSON.stringify({
          customer: customerId,
          billingType: "UNDEFINED", // Permite Pix/Boleto
          value: value,
          nextDueDate: nextDueDateStr,
          cycle: "MONTHLY",
          description: "Assinatura Flow PDV - Plano Mensal",
          // Multa por atraso
          fine: {
            value: FINE_PERCENT,
            type: "PERCENTAGE",
          },
          // Juros por mês de atraso
          interest: {
            value: INTEREST_PERCENT,
            type: "PERCENTAGE",
          },
        }),
      }
    );

    if (!ok) {
      const errorMsg =
        data.errors?.[0]?.description || "Erro ao criar assinatura no Asaas";
      logError("createSubscription", errorMsg, { customerId });
      throw new Error(errorMsg);
    }

    console.log("✅ [Asaas.createSubscription] Subscription created:", data.id);
    return {
      id: data.id,
      customerId: data.customerId || customerId,
      value: data.value,
      nextDueDate: data.nextDueDate,
      cycle: data.cycle,
      status: data.status,
    };
  },

  /**
   * Fetches the current billing information (next invoice).
   */
  async getSubscriptionBillingInfo(
    subscriptionId: string
  ): Promise<BillingInfo | null> {
    try {
      const { ok, data } = await asaasRequest<{ data: BillingInfo[] }>(
        `/payments?subscription=${subscriptionId}&status=PENDING&limit=1`
      );

      if (!ok) {
        logError("getSubscriptionBillingInfo", "Failed to fetch", {
          subscriptionId,
        });
        return null;
      }

      if (data.data && data.data.length > 0) {
        const payment = data.data[0];
        return {
          value: payment.value,
          dueDate: payment.dueDate,
          invoiceUrl: payment.invoiceUrl,
          bankSlipUrl: payment.bankSlipUrl,
          status: payment.status,
        };
      }

      return null;
    } catch (error) {
      logError("getSubscriptionBillingInfo", error, { subscriptionId });
      return null;
    }
  },

  /**
   * Fetches payment history for the subscription.
   */
  async listPaymentHistory(subscriptionId: string) {
    try {
      const { ok, data } = await asaasRequest<{ data: unknown[] }>(
        `/payments?subscription=${subscriptionId}&limit=10`
      );

      if (!ok) {
        throw new Error("Failed to fetch history");
      }

      return data.data || [];
    } catch (error) {
      logError("listPaymentHistory", error, { subscriptionId });
      return [];
    }
  },

  /**
   * Pauses (inactivates) a subscription in Asaas.
   */
  async pauseSubscription(subscriptionId: string): Promise<boolean> {
    console.log("⏸️ [Asaas.pauseSubscription]", subscriptionId);

    const { ok, data } = await asaasRequest<AsaasSubscription & AsaasError>(
      `/subscriptions/${subscriptionId}`,
      {
        method: "POST",
        body: JSON.stringify({ status: "INACTIVE" }),
      }
    );

    if (!ok) {
      const errorMsg =
        data.errors?.[0]?.description || "Erro ao pausar assinatura";
      logError("pauseSubscription", errorMsg, { subscriptionId });
      throw new Error(errorMsg);
    }

    console.log("✅ [Asaas.pauseSubscription] Subscription paused");
    return true;
  },

  /**
   * Reactivates a paused subscription in Asaas.
   */
  async reactivateSubscription(subscriptionId: string): Promise<boolean> {
    console.log("▶️ [Asaas.reactivateSubscription]", subscriptionId);

    const { ok, data } = await asaasRequest<AsaasSubscription & AsaasError>(
      `/subscriptions/${subscriptionId}`,
      {
        method: "POST",
        body: JSON.stringify({ status: "ACTIVE" }),
      }
    );

    if (!ok) {
      const errorMsg =
        data.errors?.[0]?.description || "Erro ao reativar assinatura";
      logError("reactivateSubscription", errorMsg, { subscriptionId });
      throw new Error(errorMsg);
    }

    console.log("✅ [Asaas.reactivateSubscription] Subscription reactivated");
    return true;
  },

  /**
   * Cancels (deletes) a subscription in Asaas permanently.
   */
  async cancelSubscription(subscriptionId: string): Promise<boolean> {
    console.log("🗑️ [Asaas.cancelSubscription]", subscriptionId);

    const { ok, status, data } = await asaasRequest<AsaasError>(
      `/subscriptions/${subscriptionId}`,
      { method: "DELETE" }
    );

    if (status === 204 || ok) {
      console.log("✅ [Asaas.cancelSubscription] Subscription cancelled");
      return true;
    }

    const errorMsg =
      data.errors?.[0]?.description || "Erro ao cancelar assinatura";
    logError("cancelSubscription", errorMsg, { subscriptionId });
    throw new Error(errorMsg);
  },

  /**
   * Updates the next due date of a subscription.
   */
  async updateSubscriptionDueDate(
    subscriptionId: string,
    newDueDate: Date
  ): Promise<boolean> {
    const dueDateStr = newDueDate.toISOString().split("T")[0];
    console.log(
      "📅 [Asaas.updateSubscriptionDueDate]",
      subscriptionId,
      dueDateStr
    );

    const { ok, data } = await asaasRequest<AsaasSubscription & AsaasError>(
      `/subscriptions/${subscriptionId}`,
      {
        method: "POST",
        body: JSON.stringify({ nextDueDate: dueDateStr }),
      }
    );

    if (!ok) {
      const errorMsg =
        data.errors?.[0]?.description || "Erro ao atualizar vencimento";
      logError("updateSubscriptionDueDate", errorMsg, {
        subscriptionId,
        dueDateStr,
      });
      throw new Error(errorMsg);
    }

    console.log("✅ [Asaas.updateSubscriptionDueDate] Due date updated");
    return true;
  },

  /**
   * Updates subscription value (price).
   */
  async updateSubscriptionValue(
    subscriptionId: string,
    newValue: number
  ): Promise<boolean> {
    console.log("💰 [Asaas.updateSubscriptionValue]", subscriptionId, newValue);

    const { ok, data } = await asaasRequest<AsaasSubscription & AsaasError>(
      `/subscriptions/${subscriptionId}`,
      {
        method: "POST",
        body: JSON.stringify({ value: newValue }),
      }
    );

    if (!ok) {
      const errorMsg =
        data.errors?.[0]?.description || "Erro ao atualizar valor";
      logError("updateSubscriptionValue", errorMsg, {
        subscriptionId,
        newValue,
      });
      throw new Error(errorMsg);
    }

    console.log("✅ [Asaas.updateSubscriptionValue] Value updated");
    return true;
  },

  /**
   * Gets subscription details from Asaas.
   */
  async getSubscription(subscriptionId: string): Promise<AsaasSubscription> {
    console.log("🔍 [Asaas.getSubscription]", subscriptionId);

    const { ok, data } = await asaasRequest<AsaasSubscription & AsaasError>(
      `/subscriptions/${subscriptionId}`
    );

    if (!ok) {
      const errorMsg =
        data.errors?.[0]?.description || "Erro ao buscar assinatura";
      logError("getSubscription", errorMsg, { subscriptionId });
      throw new Error(errorMsg);
    }

    return data;
  },

  /**
   * Deletes a customer from Asaas.
   * Does not throw on failure - logs and returns false.
   */
  async deleteCustomer(customerId: string): Promise<boolean> {
    console.log("🗑️ [Asaas.deleteCustomer]", customerId);

    try {
      const { ok, status } = await asaasRequest<AsaasError>(
        `/customers/${customerId}`,
        { method: "DELETE" }
      );

      if (status === 204 || ok) {
        console.log("✅ [Asaas.deleteCustomer] Customer deleted");
        return true;
      }

      console.warn("⚠️ [Asaas.deleteCustomer] Failed to delete customer");
      return false;
    } catch (error) {
      logError("deleteCustomer", error, { customerId });
      return false;
    }
  },

  /**
   * Gets the billing URL (checkout page) for a subscription
   */
  async getBillingInfo(subscriptionId: string): Promise<BillingInfo | null> {
    // Alias for getSubscriptionBillingInfo for API consistency
    return this.getSubscriptionBillingInfo(subscriptionId);
  },
};
