import { Prisma } from "@prisma/client";

// Define environment variables with fallbacks for type safety
const ASAAS_API_URL = process.env.ASAAS_API_URL || "https://sandbox.asaas.com/api/v3";
const ASAAS_API_KEY = process.env.ASAAS_API_KEY || "";
const PLAN_PRICE = parseFloat(process.env.NEXT_PUBLIC_PLAN_PRICE || "49.90");
const TRIAL_DAYS = parseInt(process.env.NEXT_PUBLIC_TRIAL_DAYS || "14", 10);

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

    const data = await response.json();

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
  }
};
