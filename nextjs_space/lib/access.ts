/**
 * Regra única de acesso SaaS do FlowPDV.
 *
 * Fonte da verdade é sempre o vencimento pago (vencimentoPlano) e o status da
 * empresa — nunca o token, que pode estar defasado. Puro (sem Prisma, sem I/O)
 * para poder rodar no Edge (middleware) e em teste.
 */

import {
  TRIAL_DAYS,
  TRIAL_TOLERANCE_DAYS,
  OVERDUE_GRACE_DAYS,
} from "@/lib/billing-policy";

const DIA_MS = 24 * 60 * 60 * 1000;

/** Trial: vence no vencimento + TRIAL_TOLERANCE_DAYS (1 dia). */
export const TOLERANCIA_TRIAL_DIAS = TRIAL_TOLERANCE_DAYS;

/** Duração padrão do trial em dias (fonte única: lib/billing-policy). */
export const TRIAL_DIAS_PADRAO = TRIAL_DAYS;

/** Cobrança vencida: acesso até vencimento + OVERDUE_GRACE_DAYS (10 dias). */
export const TOLERANCIA_PAGAMENTO_DIAS = OVERDUE_GRACE_DAYS;

export type MotivoAcesso =
  | "master"
  | "liberacao-temporaria"
  | "trial-vigente"
  | "plano-vigente"
  | "pendente"
  | "cancelado"
  | "pausado"
  | "trial-vencido"
  | "plano-vencido"
  | "sem-vencimento"
  | "empresa-ausente";

export interface DadosAcesso {
  role?: string | null;
  status?: string | null;
  vencimentoPlano?: string | Date | null;
  liberacaoTemporariaAte?: string | Date | null;
  /** Empresa possui assinatura no Asaas (distingue conta gratuita de inconsistência). */
  temAssinatura?: boolean | null;
  /** Data de criação da empresa (base do trial quando vencimentoPlano está ausente). */
  empresaCriacao?: string | Date | null;
}

export interface ResultadoAcesso {
  permitido: boolean;
  motivo: MotivoAcesso;
  /** Último instante de acesso liberado, quando a regra for por data. */
  limite?: Date | null;
  /** Dias restantes até o limite (0 quando já bloqueado). */
  diasRestantes?: number | null;
}

function paraData(valor?: string | Date | null): Date | null {
  if (!valor) return null;
  const data = valor instanceof Date ? valor : new Date(valor);
  return Number.isNaN(data.getTime()) ? null : data;
}

export function avaliarAcesso(
  dados: DadosAcesso,
  agora: Date = new Date(),
): ResultadoAcesso {
  if (dados.role === "master") {
    return { permitido: true, motivo: "master" };
  }

  if (!dados.status) {
    return { permitido: false, motivo: "empresa-ausente" };
  }

  if (dados.status === "PENDENTE") {
    return { permitido: false, motivo: "pendente" };
  }

  // CANCELADO/PENDENTE nunca sao liberados por desbloqueio temporario.
  if (dados.status === "CANCELADO") {
    return { permitido: false, motivo: "cancelado" };
  }

  const liberacao = paraData(dados.liberacaoTemporariaAte);
  if (liberacao && liberacao > agora) {
    return {
      permitido: true,
      motivo: "liberacao-temporaria",
      limite: liberacao,
      diasRestantes: Math.ceil((liberacao.getTime() - agora.getTime()) / DIA_MS),
    };
  }

  if (dados.status === "PAUSADO") {
    return { permitido: false, motivo: "pausado" };
  }

  const vencimento = paraData(dados.vencimentoPlano);

  if (!vencimento) {
    // Sem vencimento registrado: deriva o fim do trial de empresaCriacao
    // (createdAt) + tolerância de 1 dia. Nunca concede acesso infinito: não há
    // "conta-gratuita" permanente nem cupom sem prazo. Contas legadas sem
    // vencimento ficam sujeitas ao mesmo trial de 14 dias.
    const base = paraData(dados.empresaCriacao);
    if (!base) {
      // Sem data de criação confiável: não há base para o trial. Fail-closed:
      // não concede acesso (nem infinito nem por prazo arbitrário).
      return { permitido: false, motivo: "trial-vencido", limite: agora, diasRestantes: 0 };
    }
    const fimTrial = new Date(
      base.getTime() + TRIAL_DAYS * DIA_MS + TOLERANCIA_TRIAL_DIAS * DIA_MS,
    );

    if (agora <= fimTrial) {
      return {
        permitido: true,
        motivo: "trial-vigente",
        limite: fimTrial,
        diasRestantes: Math.ceil(
          (fimTrial.getTime() - agora.getTime()) / DIA_MS,
        ),
      };
    }

    return {
      permitido: false,
      motivo: "trial-vencido",
      limite: fimTrial,
      diasRestantes: 0,
    };
  }

  const emTeste = dados.status === "EM_TESTE";
  const toleranciaDias = emTeste
    ? TOLERANCIA_TRIAL_DIAS
    : TOLERANCIA_PAGAMENTO_DIAS;
  const limite = new Date(vencimento.getTime() + toleranciaDias * DIA_MS);

  if (agora <= limite) {
    return {
      permitido: true,
      motivo: emTeste ? "trial-vigente" : "plano-vigente",
      limite,
      diasRestantes: Math.ceil((limite.getTime() - agora.getTime()) / DIA_MS),
    };
  }

  return {
    permitido: false,
    motivo: emTeste ? "trial-vencido" : "plano-vencido",
    limite,
    diasRestantes: 0,
  };
}

export type StatusSincronizavel =
  | "ATIVO"
  | "EM_TESTE"
  | "PAUSADO"
  | "CANCELADO";

/**
 * Mantem o status atual quando ele ja e sincronizavel; caso contrario, cai em
 * PAUSADO (fail-safe). Usado quando o Asaas nao libera o plano (ex.: CONFIRMED):
 * a regra e NUNCA promover para ATIVO sem PAYMENT_RECEIVED.
 */
function statusAtualSincronizavel(statusAtual: string): StatusSincronizavel {
  switch (statusAtual) {
    case "ATIVO":
    case "EM_TESTE":
    case "PAUSADO":
    case "CANCELADO":
      return statusAtual;
    default:
      return "PAUSADO";
  }
}

/**
 * Reconciliacao de status a partir do Asaas (usada pelo master/sync).
 * Aplica as MESMAS tolerancias do runtime (trial +1d, plano +10d) via
 * avaliarAcesso, em vez de pausar no vencimento cru.
 *
 * SO `RECEIVED` ativa o plano (decisao do usuario). `CONFIRMED` NAO ativa:
 * mantem o status atual sem promover.
 *
 * `pagamentoRecebido` (prova server-side de PAYMENT_RECEIVED ja conferida) e o
 * unico caminho que promove para ATIVO. Sem ele, o status NUNCA sobe para
 * ATIVO — pausar/cancelar continuam permitidos. Fail-closed.
 */
export function decidirStatusSincronizado(
  statusAtual: string,
  statusAsaas: string,
  vencimentoPlano: string | Date | null,
  agora: Date = new Date(),
  pagamentoRecebido: boolean = false,
): StatusSincronizavel {
  switch (statusAsaas.toUpperCase()) {
    case "RECEIVED":
      // Unico status que libera/ativa o plano — e SO com prova server-side de
      // PAYMENT_RECEIVED. `RECEIVED` cru do Asaas (ex.: `getSubscription`) nao
      // e prova: mantem o status atual, igual a CONFIRMED. Fail-closed.
      return pagamentoRecebido ? "ATIVO" : statusAtualSincronizavel(statusAtual);
    case "CONFIRMED":
      // Pagamento ainda NAO liquidado: nao ativa. Mantem o status atual sem
      // promover PAUSADO -> ATIVO (evita liberar sem PAYMENT_RECEIVED).
      return statusAtualSincronizavel(statusAtual);
    case "INACTIVE":
    case "CANCELLED":
    case "CANCELED":
      return "CANCELADO";
    default: {
      const candidato: StatusSincronizavel =
        statusAtual === "EM_TESTE" ? "EM_TESTE" : "ATIVO";
      const avaliacao = avaliarAcesso(
        {
          role: "admin",
          status: candidato,
          vencimentoPlano,
          temAssinatura: true,
        },
        agora,
      );
      // Pausar/vencer continua valendo sem pagamento (nao e promocao).
      if (!avaliacao.permitido) return "PAUSADO";
      // NUNCA promove para ATIVO sem prova de PAYMENT_RECEIVED.
      if (candidato === "ATIVO" && !pagamentoRecebido) {
        return statusAtualSincronizavel(statusAtual);
      }
      return candidato;
    }
  }
}

/**
 * Gate de reativacao manual (master). Tecnologia/suporte so pode reativar uma
 * conta com PAGAMENTO RECEBIDO comprovado server-side.
 *
 * O boolean NAO e prova: ele apenas transporta o resultado de
 * `conferirPagamentoConfirmado` (cobertura local gravada em PAYMENT_RECEIVED ou
 * historico Asaas RECEIVED vinculado). Nao aceitar aqui nenhuma flag vinda do
 * cliente. CANCELADO nunca e reativado manualmente.
 */
export function podeReativarManualmente(
  statusAtual: string | null,
  pagamentoRecebidoComprovado: boolean,
): { permitido: boolean; motivo: string } {
  if (statusAtual === "CANCELADO") {
    return {
      permitido: false,
      motivo: "Empresa cancelada nao pode ser reativada manualmente.",
    };
  }
  if (!pagamentoRecebidoComprovado) {
    return {
      permitido: false,
      motivo:
        "Reativacao exige pagamento recebido (PAYMENT_RECEIVED). O acesso e liberado automaticamente pelo webhook.",
    };
  }
  return { permitido: true, motivo: "Pagamento recebido." };
}

/** Motivo aceito pela página /bloqueado. */
export function motivoParaBloqueio(
  motivo: MotivoAcesso,
): "pendente" | "cancelado" | "pausado" | "vencido" {
  switch (motivo) {
    case "pendente":
      return "pendente";
    case "cancelado":
      return "cancelado";
    case "pausado":
      return "pausado";
    default:
      return "vencido";
  }
}

/** Mensagem de login para o erro de acesso. */
export function mensagemBloqueio(resultado: ResultadoAcesso): string {
  switch (resultado.motivo) {
    case "pendente":
      return "Sua empresa está aguardando aprovação do administrador. Tente novamente mais tarde.";
    case "cancelado":
      return "Esta empresa foi cancelada. Entre em contato com o suporte.";
    case "trial-vencido":
      return "Seu período de teste terminou. Regularize o pagamento para voltar a acessar.";
    case "plano-vencido":
      return "Acesso bloqueado. O pagamento da sua mensalidade não foi identificado.";
    case "sem-vencimento":
      return "Não há cobertura de plano registrada para esta empresa. Entre em contato com o suporte.";
    case "empresa-ausente":
      return "Sua conta não está vinculada a uma empresa ativa. Entre em contato com o suporte.";
    default:
      return "Pagamento Pendente. Regularize para acessar.";
  }
}