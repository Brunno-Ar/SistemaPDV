/**
 * Monta a resposta da rota /api/billing/pending.
 *
 * Regra de seguranca: TODOS os casos de ausencia (usuario inexistente, empresa
 * ausente, sem assinatura, sem fatura, erro do Asaas) devolvem o MESMO corpo e
 * status genericos. Assim nao se distingue uma conta da outra por mensagem ou
 * status, e o email nunca vem de query (so da sessao).
 *
 * Funcao pura, testavel sem Prisma/Asaas.
 */

export type CasoFatura =
  | { caso: "sem-usuario" }
  | { caso: "sem-assinatura" }
  | { caso: "sem-fatura" }
  | { caso: "erro-asaas" }
  | {
      caso: "fatura";
      value: number;
      invoiceUrl: string | null;
      status: string;
      dueDate: string | Date;
    };

export interface BillingPublico {
  value: number;
  invoiceUrl: string | null;
  status: string;
  vencimento: string;
}

export interface RespostaFatura {
  status: number;
  body: { billing: null } | { billing: BillingPublico };
}

/** Corpo/status unico para qualquer caso sem fatura visivel. */
export function respostaGenerica(): RespostaFatura {
  return { status: 200, body: { billing: null } };
}

export function montarRespostaFatura(entrada: CasoFatura): RespostaFatura {
  if (entrada.caso !== "fatura") {
    return respostaGenerica();
  }

  const vencimento = new Date(entrada.dueDate);
  return {
    status: 200,
    body: {
      billing: {
        value: entrada.value,
        invoiceUrl: entrada.invoiceUrl,
        status: entrada.status,
        vencimento: Number.isNaN(vencimento.getTime())
          ? ""
          : vencimento.toLocaleDateString("pt-BR"),
      },
    },
  };
}
