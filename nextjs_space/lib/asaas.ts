import { Prisma } from "@prisma/client";

// Define environment variables with fallbacks for type safety
const ASAAS_API_URL = process.env.ASAAS_API_URL || "https://sandbox.asaas.com/api/v3";

// API Key hardcoded temporariamente para teste (o $ no .env causa problemas)
const ASAAS_API_KEY = "$aact_hmlg_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6OmJlODAyMDc1LTFjNTEtNDA5NC05N2ZkLTUxYWRmNjg4ODA0Njo6JGFhY2hfZjA3MzllMjgtNWE2MC00NjM4LWI1NDctNThmMWIxNDliNTg4";

const PLAN_PRICE = parseFloat(process.env.NEXT_PUBLIC_PLAN_PRICE || "49.90");
const TRIAL_DAYS = parseInt(process.env.NEXT_PUBLIC_TRIAL_DAYS || "14", 10);

console.log("ASAAS_API_KEY loaded:", ASAAS_API_KEY ? "***" + ASAAS_API_KEY.slice(-10) : "EMPTY");

if (!ASAAS_API_KEY) {
  console.warn("ASAAS_API_KEY is not defined. Integration calls will fail.");
}

interface AsaasCustomer {
  id: string;
  name: string;
  email: string;
  cpfCnpj: string;
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
  bankSlipUrl?: string; // Boleto
  pixQrCodeUrl?: string; // Pix
}

export const asaas = {
  /**
   * Creates a new customer in Asaas.
   */
  async createCustomer(
    name: string,
    cpfCnpj: string,
    email: string,
    mobilePhone?: string
  ): Promise<AsaasCustomer> {
    // Basic validation
    if (!cpfCnpj) throw new Error("CPF/CNPJ is required for Asaas integration");

    console.log("Asaas createCustomer - Request:", { name, cpfCnpj, email, mobilePhone });
    console.log("Asaas API URL:", `${ASAAS_API_URL}/customers`);

    const response = await fetch(`${ASAAS_API_URL}/customers`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        access_token: ASAAS_API_KEY,
      },
      body: JSON.stringify({
        name,
        cpfCnpj,
        email,
        mobilePhone,
        notificationDisabled: false,
      }),
    });

    // Tentar ler a resposta como texto primeiro
    const responseText = await response.text();
    console.log("Asaas createCustomer - Response Status:", response.status);
    console.log("Asaas createCustomer - Response Body:", responseText);

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error("Asaas response is not valid JSON:", responseText);
      throw new Error(`Erro na comunicação com Asaas (status ${response.status})`);
    }

    if (!response.ok) {
      console.error("Asaas createCustomer error:", data);
      throw new Error(
        data.errors?.[0]?.description || "Failed to create customer in Asaas"
      );
    }

    return {
      id: data.id,
      name: data.name,
      email: data.email,
      cpfCnpj: data.cpfCnpj,
    };
  },

  /**
   * Creates a subscription for the customer.
   * Starts after the trial period.
   */
  async createSubscription(customerId: string): Promise<AsaasSubscription> {
    const nextDueDate = new Date();
    nextDueDate.setDate(nextDueDate.getDate() + TRIAL_DAYS);
    const nextDueDateStr = nextDueDate.toISOString().split("T")[0]; // YYYY-MM-DD

    const response = await fetch(`${ASAAS_API_URL}/subscriptions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        access_token: ASAAS_API_KEY,
      },
      body: JSON.stringify({
        customer: customerId,
        billingType: "UNDEFINED", // Allows user to choose Pix/Boleto later
        value: PLAN_PRICE,
        nextDueDate: nextDueDateStr,
        cycle: "MONTHLY",
        description: "Assinatura Flow PDV - Plano Mensal",
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Asaas createSubscription error:", data);
      throw new Error(
        data.errors?.[0]?.description || "Failed to create subscription in Asaas"
      );
    }

    return {
      id: data.id,
      customerId: data.customer,
      value: data.value,
      nextDueDate: data.nextDueDate,
      cycle: data.cycle,
      status: data.status,
    };
  },

  /**
   * Fetches the current billing information (next invoice).
   */
  async getSubscriptionBillingInfo(subscriptionId: string): Promise<BillingInfo | null> {
    // Fetch payments associated with the subscription to find the pending one
    const response = await fetch(
      `${ASAAS_API_URL}/payments?subscription=${subscriptionId}&status=PENDING&limit=1`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          access_token: ASAAS_API_KEY,
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Asaas getPayments error:", data);
      return null;
    }

    if (data.data && data.data.length > 0) {
      const payment = data.data[0];
      return {
        value: payment.value,
        dueDate: payment.dueDate,
        invoiceUrl: payment.invoiceUrl,
        bankSlipUrl: payment.bankSlipUrl,
      };
    }

    // If no pending payment, maybe fetch the subscription directly to check status
    return null;
  },

  /**
   * Fetches payment history for the subscription.
   */
  async listPaymentHistory(subscriptionId: string) {
    const response = await fetch(
      `${ASAAS_API_URL}/payments?subscription=${subscriptionId}&limit=10`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          access_token: ASAAS_API_KEY,
        },
      }
    );

    const data = await response.json();
    if (!response.ok) {
        throw new Error("Failed to fetch history");
    }

    return data.data || [];
  },

  /**
   * Pauses (inactivates) a subscription in Asaas.
   * This stops future billings until reactivated.
   */
  async pauseSubscription(subscriptionId: string): Promise<boolean> {
    console.log("Asaas pauseSubscription:", subscriptionId);
    
    const response = await fetch(
      `${ASAAS_API_URL}/subscriptions/${subscriptionId}`,
      {
        method: "POST", // Asaas uses POST for status changes
        headers: {
          "Content-Type": "application/json",
          access_token: ASAAS_API_KEY,
        },
        body: JSON.stringify({
          status: "INACTIVE",
        }),
      }
    );

    const data = await response.json();
    console.log("Asaas pauseSubscription response:", data);

    if (!response.ok) {
      console.error("Asaas pauseSubscription error:", data);
      throw new Error(
        data.errors?.[0]?.description || "Erro ao pausar assinatura no Asaas"
      );
    }

    return true;
  },

  /**
   * Reactivates a paused subscription in Asaas.
   */
  async reactivateSubscription(subscriptionId: string): Promise<boolean> {
    console.log("Asaas reactivateSubscription:", subscriptionId);
    
    const response = await fetch(
      `${ASAAS_API_URL}/subscriptions/${subscriptionId}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          access_token: ASAAS_API_KEY,
        },
        body: JSON.stringify({
          status: "ACTIVE",
        }),
      }
    );

    const data = await response.json();
    console.log("Asaas reactivateSubscription response:", data);

    if (!response.ok) {
      console.error("Asaas reactivateSubscription error:", data);
      throw new Error(
        data.errors?.[0]?.description || "Erro ao reativar assinatura no Asaas"
      );
    }

    return true;
  },

  /**
   * Cancels (deletes) a subscription in Asaas permanently.
   * Use this when deleting a company.
   */
  async cancelSubscription(subscriptionId: string): Promise<boolean> {
    console.log("Asaas cancelSubscription:", subscriptionId);
    
    const response = await fetch(
      `${ASAAS_API_URL}/subscriptions/${subscriptionId}`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          access_token: ASAAS_API_KEY,
        },
      }
    );

    // DELETE may return 204 No Content on success
    if (response.status === 204 || response.ok) {
      console.log("Asaas subscription cancelled successfully");
      return true;
    }

    const data = await response.json();
    console.error("Asaas cancelSubscription error:", data);
    throw new Error(
      data.errors?.[0]?.description || "Erro ao cancelar assinatura no Asaas"
    );
  },

  /**
   * Updates the next due date of a subscription.
   * This changes when the next billing will occur.
   */
  async updateSubscriptionDueDate(
    subscriptionId: string,
    newDueDate: Date
  ): Promise<boolean> {
    const dueDateStr = newDueDate.toISOString().split("T")[0]; // YYYY-MM-DD
    console.log("Asaas updateSubscriptionDueDate:", subscriptionId, dueDateStr);
    
    const response = await fetch(
      `${ASAAS_API_URL}/subscriptions/${subscriptionId}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          access_token: ASAAS_API_KEY,
        },
        body: JSON.stringify({
          nextDueDate: dueDateStr,
        }),
      }
    );

    const data = await response.json();
    console.log("Asaas updateSubscriptionDueDate response:", data);

    if (!response.ok) {
      console.error("Asaas updateSubscriptionDueDate error:", data);
      throw new Error(
        data.errors?.[0]?.description || "Erro ao atualizar vencimento no Asaas"
      );
    }

    return true;
  },

  /**
   * Updates subscription value (price).
   */
  async updateSubscriptionValue(
    subscriptionId: string,
    newValue: number
  ): Promise<boolean> {
    console.log("Asaas updateSubscriptionValue:", subscriptionId, newValue);
    
    const response = await fetch(
      `${ASAAS_API_URL}/subscriptions/${subscriptionId}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          access_token: ASAAS_API_KEY,
        },
        body: JSON.stringify({
          value: newValue,
        }),
      }
    );

    const data = await response.json();
    console.log("Asaas updateSubscriptionValue response:", data);

    if (!response.ok) {
      console.error("Asaas updateSubscriptionValue error:", data);
      throw new Error(
        data.errors?.[0]?.description || "Erro ao atualizar valor no Asaas"
      );
    }

    return true;
  },

  /**
   * Gets subscription details from Asaas.
   */
  async getSubscription(subscriptionId: string) {
    const response = await fetch(
      `${ASAAS_API_URL}/subscriptions/${subscriptionId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          access_token: ASAAS_API_KEY,
        },
      }
    );

    const data = await response.json();
    if (!response.ok) {
      throw new Error("Failed to fetch subscription");
    }

    return data;
  },

  /**
   * Deletes a customer from Asaas.
   * Use this when permanently deleting a company.
   */
  async deleteCustomer(customerId: string): Promise<boolean> {
    console.log("Asaas deleteCustomer:", customerId);
    
    const response = await fetch(
      `${ASAAS_API_URL}/customers/${customerId}`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          access_token: ASAAS_API_KEY,
        },
      }
    );

    if (response.status === 204 || response.ok) {
      console.log("Asaas customer deleted successfully");
      return true;
    }

    const data = await response.json();
    console.error("Asaas deleteCustomer error:", data);
    // Don't throw error for customer deletion failures - log and continue
    return false;
  }
};
