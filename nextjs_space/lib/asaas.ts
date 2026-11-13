import {
  calcularVencimentoTrial,
  PRECO_PLANO_PADRAO,
} from "@/lib/billing-policy";

// Define environment variables. Sem fallback: ausência falha fechado em
// asaasRequest antes de qualquer fetch (nunca expõe live por omissão).
const ASAAS_API_URL = process.env.ASAAS_API_URL;
const ASAAS_API_KEY = process.env.ASAAS_API_KEY;

// Multa e Juros configuráveis
const FINE_PERCENT = parseFloat(process.env.ASAAS_FINE_PERCENT || "2"); // 2%
const INTEREST_PERCENT = parseFloat(process.env.ASAAS_INTEREST_PERCENT || "1"); // 1% a.m.

// Validação na inicialização (apenas log, não quebra o build)
if (!ASAAS_API_KEY) {
  console.warn(
    "⚠️ ASAAS_API_KEY não está definida. As chamadas de integração irão falhar.",
  );
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

interface PaymentHistoryItem {
  id: string;
  status: string;
  value: number;
  dueDate: string;
  invoiceUrl: string;
  bankSlipUrl?: string;
  /** Vinculo do pagamento: prova de que e do cliente/assinatura da empresa. */
  customer?: string | null;
  subscription?: string | null;
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
  context?: Record<string, unknown>,
) {
  console.error(`❌ [Asaas.${method}] Error:`, {
    message: error instanceof Error ? error.message : String(error),
    context,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Guard fail-closed: impede chamadas Asaas LIVE (producao) fora de ambiente
 * de producao (preview/development), sem override opt-in.
 * - Producao (VERCEL_ENV=production): libera.
 * - Sandbox (URL nao eh api.asaas.com): libera em qualquer ambiente.
 * - Testes de unidade (NODE_ENV=test sem VERCEL_ENV): libera (ambiente
 *   controlado); preview/development reais com URL live: bloqueia ANTES de
 *   qualquer fetch.
 */
export function assertAsaasNotLiveOutsideProduction(): void {
  if (!ASAAS_API_URL) return;
  const isProduction = process.env.VERCEL_ENV === "production";
  const isLiveUrl =
    ASAAS_API_URL.includes("api.asaas.com") &&
    !ASAAS_API_URL.includes("sandbox");

  if (!isProduction && isLiveUrl) {
    if (process.env.NODE_ENV === "test" && !process.env.VERCEL_ENV) {
      return;
    }
    throw new Error(
      "Chamadas Asaas ao ambiente live bloqueadas fora de producao " +
        "(preview/development). Use sandbox ou defina VERCEL_ENV=production.",
    );
  }
}

/**
 * Helper function for API requests
 */
async function asaasRequest<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<{ ok: boolean; data: T; status: number }> {
  if (!ASAAS_API_URL || !ASAAS_API_KEY) {
    throw new Error(
      "ASAAS_API_URL e ASAAS_API_KEY são obrigatórias; falha fechada (sem fallback live).",
    );
  }
  assertAsaasNotLiveOutsideProduction();
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
        `/customers?cpfCnpj=${encodeURIComponent(cpfCnpj)}`,
      );

      if (ok && data.data && data.data.length > 0) {
        console.log(
          "✅ [Asaas.findCustomerByCpfCnpj] Customer found:",
          data.data[0].id,
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
    updates: { name?: string; email?: string; mobilePhone?: string },
  ): Promise<AsaasCustomer> {
    console.log("📝 [Asaas.updateCustomer] Updating:", customerId);

    const { ok, data } = await asaasRequest<AsaasCustomer & AsaasError>(
      `/customers/${customerId}`,
      {
        method: "POST",
        body: JSON.stringify(updates),
      },
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
    },
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
      },
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
      `/customers/${customerId}`,
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
    customValue?: number,
  ): Promise<AsaasSubscription> {
    const nextDueDate = calcularVencimentoTrial();
    const nextDueDateStr = nextDueDate.toISOString().split("T")[0];

    const value = customValue !== undefined ? customValue : PRECO_PLANO_PADRAO;

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
      },
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
    subscriptionId: string,
  ): Promise<BillingInfo | null> {
    try {
      const { ok, data } = await asaasRequest<{ data: BillingInfo[] }>(
        `/payments?subscription=${subscriptionId}&status=PENDING&limit=1`,
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
   *
   * `null` = falha do Asaas; `[]` = lista vazia de verdade. Quem PROVA pagamento
   * precisa falhar fechado com `null` — tratar erro como lista vazia escondia
   * pendencia. Pagina de 100 em 100 (limite da API) para nao perder um RECEIVED
   * antigo que ainda cobre o ciclo.
   */
  async listPaymentHistory(
    subscriptionId: string,
  ): Promise<PaymentHistoryItem[] | null> {
    const LIMITE = 100;
    const MAX_PAGINAS = 5;
    const historico: PaymentHistoryItem[] = [];

    try {
      for (let pagina = 0; pagina < MAX_PAGINAS; pagina++) {
        const { ok, data } = await asaasRequest<{
          data?: PaymentHistoryItem[];
          hasMore?: boolean;
        }>(
          `/payments?subscription=${subscriptionId}&limit=${LIMITE}&offset=${pagina * LIMITE}`,
        );

        if (!ok) throw new Error("Failed to fetch history");

        const lote = data.data ?? [];
        historico.push(...lote);
        if (data.hasMore === false || lote.length < LIMITE) break;
      }

      return historico;
    } catch (error) {
      logError("listPaymentHistory", error, { subscriptionId });
      return null;
    }
  },

  /**
   * Consulta pontual de UMA cobranca (GET /payments/{id}). Serve para o webhook
   * que chega sem `dueDate`: uma chamada para provar o ciclo antes de escolher
   * entre recusar de vez e pedir reentrega. `null` = erro ou resposta inutil.
   */
  async getPayment(paymentId: string): Promise<PaymentHistoryItem | null> {
    try {
      const { ok, data } = await asaasRequest<PaymentHistoryItem>(
        `/payments/${paymentId}`,
      );
      return ok && data?.id ? data : null;
    } catch (error) {
      logError("getPayment", error, { paymentId });
      return null;
    }
  },

  /** Lista pagamentos de um customer (usa cliente Asaas compartilhado). */
  async listPaymentsByCustomer(customerId: string): Promise<{
    data: PaymentHistoryItem[];
    totalCount: number;
  } | null> {
    try {
      const { ok, data } = await asaasRequest<{
        data?: PaymentHistoryItem[];
        totalCount?: number;
      }>(`/payments?customer=${customerId}&limit=50`);
      if (!ok) return null;
      return {
        data: data.data ?? [],
        totalCount: data.totalCount ?? data.data?.length ?? 0,
      };
    } catch (error) {
      logError("listPaymentsByCustomer", error, { customerId });
      return null;
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
      },
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
      },
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
      { method: "DELETE" },
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
    newDueDate: Date,
  ): Promise<boolean> {
    const dueDateStr = newDueDate.toISOString().split("T")[0];
    console.log(
      "📅 [Asaas.updateSubscriptionDueDate]",
      subscriptionId,
      dueDateStr,
    );

    const { ok, data } = await asaasRequest<AsaasSubscription & AsaasError>(
      `/subscriptions/${subscriptionId}`,
      {
        method: "POST",
        body: JSON.stringify({ nextDueDate: dueDateStr }),
      },
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
    newValue: number,
  ): Promise<boolean> {
    console.log("💰 [Asaas.updateSubscriptionValue]", subscriptionId, newValue);

    const { ok, data } = await asaasRequest<AsaasSubscription & AsaasError>(
      `/subscriptions/${subscriptionId}`,
      {
        method: "POST",
        body: JSON.stringify({ value: newValue }),
      },
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
      `/subscriptions/${subscriptionId}`,
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
        { method: "DELETE" },
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
