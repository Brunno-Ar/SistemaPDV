/**
 * Servico do vinculo Asaas no painel master: preview (somente leitura) e
 * confirmacao (unica porta que escreve).
 *
 * CONTRATO:
 *  - `montarPreview` NAO escreve nada e NAO cria nada no Asaas: so GETs
 *    (customer, assinaturas, historico de pagamentos) + leitura local.
 *  - `aplicarConfirmacao` revalida o preview inteiro e exige o token emitido
 *    por ele. Token expirado/divergente = 409, nenhuma escrita.
 *  - Erro de busca no Asaas e fail-closed: jamais tratado como "nao existe"
 *    (era assim que se duplicava customer/assinatura).
 *  - Nada aqui libera acesso: plano so sobe com PAYMENT_RECEIVED provado.
 *  - Cancelamento terminal nunca e implicito; exige `confirmarTerminal`.
 */

import { prisma } from "@/lib/db";
import { StatusEmpresa } from "@prisma/client";
import { asaas } from "@/lib/asaas";
import { decidirStatusSincronizado } from "@/lib/access";
import {
  avancarVencimentoSeMaior,
  coberturaComprovada,
  conferirPagamentoConfirmado,
} from "@/lib/pagamento";
import {
  PRECO_PLANO_PADRAO,
  calcularVencimentoTrial,
} from "@/lib/billing-policy";
import {
  classificarAssinaturas,
  dataHojeSaoPaulo,
  gerarTokenPreview,
  mascararDocumento,
  mascararEmail,
  montarProposta,
  podePromover,
  validarFormatoDataIso,
  verificarTokenPreview,
  versaoSnapshot,
} from "@/lib/asaas-vinculo";
import type { AssinaturaAsaas } from "@/lib/asaas-vinculo";

/** Janela do token de preview. Curta de proposito: confirm sempre revalida. */
export const TTL_PREVIEW_MS = 10 * 60 * 1000;

export type ModoPreview = "vinculada" | "provisionamento" | "conflito";

export interface CandidatoResumo {
  id: string;
  status: string | null;
  valor: number | null;
  ciclo: string | null;
  vencimento: string | null;
}

export interface PreviewPayload {
  empresaId: string;
  modo: ModoPreview;
  versao: string;
  token: string;
  expiraEm: string;
  empresa: {
    nome: string;
    status: string;
    vencimentoPlano: string | null;
    ciclo: string;
    cupomAplicado: string | null;
    documentoMascarado: string | null;
    emailMascarado: string | null;
    adminId?: string | null;
    adminEmailMascarado?: string | null;
    admins?: Array<{ id: string; nome: string | null; emailMascarado: string | null }>;
    adminEmail?: string | null;
  };
  asaas: {
    customer: { id: string | null; situacao: "existente" | "ausente" };
    assinatura: {
      id: string | null;
      situacao: "existente" | "ausente" | "multipla";
      status: string | null;
      valor: number | null;
      ciclo: string | null;
      total: number;
      candidatos: CandidatoResumo[];
    };
    pagamento: {
      recebido: boolean;
      fonte: string;
      coberturaAte: string | null;
      pendente: boolean;
    };
  };
  proposta: {
    acao: "sincronizar" | "vincular_assinatura" | "criar_assinatura";
    statusAtual: string;
    statusProposto: string;
    statusAsaasTerminal: boolean;
    requerConfirmacaoTerminal: boolean;
    /** Criacao exige aceite explicito dos termos mostrados no preview. */
    requerConfirmacaoTermos: boolean;
    vencimentoAtual: string | null;
    vencimentoProposto: string | null;
    liberaAcesso: boolean;
  };
  provisionamento?: {
    criarCustomer: boolean;
    criarAssinatura: boolean;
    valor: number;
    ciclo: string;
    billingType: string;
    primeiroVencimento: string;
    adminId?: string | null;
  };
  conflito?: { motivo: string; candidatos: CandidatoResumo[] };
  avisos: string[];
}

export type ResultadoPreview =
  | { ok: true; preview: PreviewPayload }
  | {
      ok: false;
      http: number;
      erro: string;
      motivo?: string;
      candidatos?: CandidatoResumo[];
      admins?: Array<{ id: string; nome: string | null; emailMascarado: string | null }>;
    };

export type ResultadoConfirmacao = { http: number; body: Record<string, unknown> };

/**
 * Segredo do token. Falha fechada se nenhum estiver configurado — nao existe
 * valor padrao. `ASAAS_WEBHOOK_SECRET` serve de fallback documentado porque ja
 * e obrigatorio em producao; `MASTER_PREVIEW_SECRET` permite separar depois.
 */
function segredoPreview(): string | null {
  return (
    process.env.MASTER_PREVIEW_SECRET ||
    process.env.ASAAS_WEBHOOK_SECRET ||
    null
  );
}

function iso(valor: Date | null | undefined): string | null {
  return valor ? new Date(valor).toISOString() : null;
}

function statusTerminal(status: string | null | undefined): boolean {
  const s = (status ?? "").toUpperCase();
  return s === "CANCELLED" || s === "CANCELED";
}

function resumirAssinatura(sub: AssinaturaAsaas): CandidatoResumo {
  return {
    id: sub.id,
    status: sub.status ?? null,
    valor: typeof sub.value === "number" ? sub.value : null,
    ciclo: sub.cycle ?? null,
    vencimento: sub.nextDueDate ?? null,
  };
}

type EmpresaPreview = {
  id: string;
  nome: string;
  status: StatusEmpresa;
  vencimentoPlano: Date | null;
  asaasCustomerId: string | null;
  asaasSubscriptionId: string | null;
  cpfCnpj: string | null;
  telefone: string | null;
  ciclo: string;
  cupomAplicado: string | null;
  enderecoLogradouro: string | null;
  enderecoNumero: string | null;
  enderecoBairro: string | null;
  enderecoCep: string | null;
};

async function carregarEmpresa(empresaId: string): Promise<EmpresaPreview | null> {
  return prisma.empresa.findUnique({
    where: { id: empresaId },
    select: {
      id: true,
      nome: true,
      status: true,
      vencimentoPlano: true,
      asaasCustomerId: true,
      asaasSubscriptionId: true,
      cpfCnpj: true,
      telefone: true,
      ciclo: true,
      cupomAplicado: true,
      enderecoLogradouro: true,
      enderecoNumero: true,
      enderecoBairro: true,
      enderecoCep: true,
    },
  });
}

export interface AdminItem {
  id: string;
  name: string | null;
  email: string;
}

async function buscarAdmins(empresaId: string): Promise<AdminItem[]> {
  if (typeof (prisma.user as any).findMany === "function") {
    const list = await (prisma.user as any).findMany({
      where: { empresaId, role: "admin" },
      select: { id: true, name: true, email: true },
    });
    if (Array.isArray(list)) return list;
  }
  const single = await prisma.user.findFirst({
    where: { empresaId, role: "admin" },
    select: { id: true, name: true, email: true },
  });
  return single ? [single] : [];
}

async function resolverAdmin(
  empresaId: string,
  adminIdOpt?: string | null,
): Promise<
  | {
      ok: true;
      selecionado: AdminItem | null;
      admins: Array<{ id: string; nome: string | null; emailMascarado: string | null }>;
    }
  | {
      ok: false;
      http: number;
      erro: string;
      motivo: string;
      admins?: Array<{ id: string; nome: string | null; emailMascarado: string | null }>;
    }
> {
  const admins = await buscarAdmins(empresaId);
  const adminsResumo = admins.map((a) => ({
    id: a.id,
    nome: a.name,
    emailMascarado: mascararEmail(a.email),
  }));

  if (adminIdOpt !== undefined && adminIdOpt !== null && adminIdOpt !== "") {
    let admin = admins.find((a) => a.id === adminIdOpt) ?? null;
    if (!admin) {
      const direto = await prisma.user.findFirst({
        where: { id: adminIdOpt, empresaId, role: "admin" },
        select: { id: true, name: true, email: true },
      });
      if (direto) {
        admin = direto;
      }
    }
    if (!admin) {
      return {
        ok: false,
        http: 400,
        erro: "admin_invalido",
        motivo: "admin_nao_encontrado_ou_invalido",
      };
    }
    return { ok: true, selecionado: admin, admins: adminsResumo };
  }

  // Sem selecao explicita: se houver multiplos admins, recusa escolha arbitraria
  if (admins.length > 1) {
    return {
      ok: false,
      http: 409,
      erro: "conflito_vinculo",
      motivo: "multiplos_admins_selecao_obrigatoria",
      admins: adminsResumo,
    };
  }

  return { ok: true, selecionado: admins[0] ?? null, admins: adminsResumo };
}

/**
 * Preco inequivoco do plano: cupom aplicado valido tem prioridade; sem cupom,
 * o preco publicado. Cupom invalido/expirado/esgotado NAO cai para o preco
 * cheio em silencio — vira conflito.
 */
async function resolverValor(
  cupom: string | null,
): Promise<{ ok: true; valor: number } | { ok: false; motivo: string }> {
  if (!cupom) return { ok: true, valor: PRECO_PLANO_PADRAO };

  const cupomDb = await prisma.cupom.findUnique({
    where: { codigo: cupom.toUpperCase() },
    select: {
      descontoPorcentagem: true,
      validoAte: true,
      usosAtuais: true,
      limiteUsos: true,
    },
  });

  if (!cupomDb) return { ok: false, motivo: "cupom_aplicado_inexistente" };
  if (cupomDb.validoAte && cupomDb.validoAte < new Date()) {
    return { ok: false, motivo: "cupom_aplicado_expirado" };
  }
  if (cupomDb.limiteUsos !== null && cupomDb.usosAtuais >= cupomDb.limiteUsos) {
    return { ok: false, motivo: "cupom_aplicado_esgotado" };
  }

  const valor = Number(
    (PRECO_PLANO_PADRAO * ((100 - cupomDb.descontoPorcentagem) / 100)).toFixed(2),
  );
  if (!(valor > 0)) return { ok: false, motivo: "valor_do_cupom_invalido" };
  return { ok: true, valor };
}

export interface OpcoesPreview {
  agora?: Date;
  primeiroVencimento?: string | null;
  adminId?: string | null;
}

/**
 * Leitura completa do estado (Asaas + DB) e montagem da proposta. Chamado pelo
 * preview e pelo confirm (revalidacao). Nunca escreve.
 */
export async function montarPreview(
  empresaId: string,
  agoraOuOpcoes?: Date | OpcoesPreview,
  opcoesExtra?: OpcoesPreview,
): Promise<ResultadoPreview> {
  const segredo = segredoPreview();
  if (!segredo) return { ok: false, http: 503, erro: "segredo_preview_ausente" };

  let agora: Date;
  let primeiroVencimentoOpt: string | null | undefined;
  let adminIdOpt: string | null | undefined;

  if (agoraOuOpcoes instanceof Date) {
    agora = agoraOuOpcoes;
    primeiroVencimentoOpt = opcoesExtra?.primeiroVencimento;
    adminIdOpt = opcoesExtra?.adminId;
  } else if (agoraOuOpcoes && typeof agoraOuOpcoes === "object") {
    agora = agoraOuOpcoes.agora ?? new Date();
    primeiroVencimentoOpt =
      agoraOuOpcoes.primeiroVencimento !== undefined
        ? agoraOuOpcoes.primeiroVencimento
        : opcoesExtra?.primeiroVencimento;
    adminIdOpt =
      agoraOuOpcoes.adminId !== undefined
        ? agoraOuOpcoes.adminId
        : opcoesExtra?.adminId;
  } else {
    agora = new Date();
    primeiroVencimentoOpt = opcoesExtra?.primeiroVencimento;
    adminIdOpt = opcoesExtra?.adminId;
  }

  const empresa = await carregarEmpresa(empresaId);
  if (!empresa) return { ok: false, http: 404, erro: "empresa_nao_encontrada" };

  const adminRes = await resolverAdmin(empresaId, adminIdOpt);
  if (!adminRes.ok) {
    return {
      ok: false,
      http: adminRes.http,
      erro: adminRes.erro,
      motivo: adminRes.motivo,
      ...(adminRes.admins ? { admins: adminRes.admins } : {}),
    };
  }

  const adminSelecionado = adminRes.selecionado;
  const emailAdminValidado = adminSelecionado?.email ?? null;

  const avisos: string[] = [];

  // ---------- customer ----------
  let customerId = empresa.asaasCustomerId;
  let customerSituacao: "existente" | "ausente" = "ausente";

  if (customerId) {
    try {
      await asaas.getCustomer(customerId);
      customerSituacao = "existente";
    } catch {
      // Falha de GET nao e "customer inexistente": bloqueia qualquer criacao.
      return {
        ok: false,
        http: 503,
        erro: "falha_consulta_asaas",
        motivo: "customer_vinculado_nao_confirmado",
      };
    }
  } else if (empresa.cpfCnpj) {
    const busca = await asaas.buscarCustomerPorCpfCnpj(empresa.cpfCnpj);
    if (!busca.ok) {
      return {
        ok: false,
        http: 502,
        erro: "falha_consulta_asaas",
        motivo: "busca_customer_falhou",
      };
    }

    if (busca.customer) {
      customerId = busca.customer.id;
      customerSituacao = "existente";

      const outra = await prisma.empresa.findFirst({
        where: { asaasCustomerId: busca.customer.id, id: { not: empresaId } },
        select: { id: true },
      });
      if (outra) {
        return {
          ok: false,
          http: 409,
          erro: "conflito_vinculo",
          motivo: "customer_de_outra_empresa",
        };
      }
    }
  }

  const baseEmpresa = {
    nome: empresa.nome,
    status: empresa.status,
    vencimentoPlano: iso(empresa.vencimentoPlano),
    ciclo: empresa.ciclo,
    cupomAplicado: empresa.cupomAplicado,
    documentoMascarado: mascararDocumento(empresa.cpfCnpj),
    emailMascarado: mascararEmail(emailAdminValidado),
    adminId: adminSelecionado?.id ?? null,
    adminEmailMascarado: mascararEmail(emailAdminValidado),
    admins: adminRes.admins,
    adminEmail: emailAdminValidado,
  };

  /** Fecha o preview: calcula versao, token e devolve payload. */
  const montarPayload = (
    modo: ModoPreview,
    dados: Omit<
      PreviewPayload,
      | "empresaId"
      | "modo"
      | "versao"
      | "token"
      | "expiraEm"
      | "empresa"
      | "avisos"
    >,
    estadoSnapshot: unknown,
  ): ResultadoPreview => {
    const versao = versaoSnapshot(estadoSnapshot);
    const exp = agora.getTime() + TTL_PREVIEW_MS;
    const token = gerarTokenPreview(
      { empresaId, modo, versao, exp },
      segredo,
    );

    return {
      ok: true,
      preview: {
        empresaId,
        modo,
        versao,
        token,
        expiraEm: new Date(exp).toISOString(),
        empresa: baseEmpresa,
        ...dados,
        avisos,
      },
    };
  };

  // ---------- empresa ja vinculada a uma assinatura ----------
  if (empresa.asaasSubscriptionId) {
    let sub: Awaited<ReturnType<typeof asaas.getSubscription>>;
    try {
      sub = await asaas.getSubscription(empresa.asaasSubscriptionId);
    } catch {
      return {
        ok: false,
        http: 502,
        erro: "falha_consulta_asaas",
        motivo: "assinatura_vinculada_nao_confirmada",
      };
    }

    const historico = await asaas.listPaymentHistory(empresa.asaasSubscriptionId);
    const ctxCustomer = empresa.asaasCustomerId ?? sub.customerId ?? null;

    const conferencia = await conferirPagamentoConfirmado(
      {
        asaasCustomerId: ctxCustomer,
        asaasSubscriptionId: empresa.asaasSubscriptionId,
        status: empresa.status,
        vencimentoPlano: empresa.vencimentoPlano,
      },
      async () => historico,
      agora,
    );

    const cobertura = coberturaComprovada(historico, {
      customerId: ctxCustomer,
      subscriptionId: empresa.asaasSubscriptionId,
      agora,
    });

    const terminal = statusTerminal(sub.status);
    // Promocao exige prova completa: RECEIVED + cobertura existente e vigente.
    const promovivel = podePromover(conferencia.confirmado, cobertura, agora);
    const statusProposto = decidirStatusSincronizado(
      empresa.status,
      sub.status ?? "",
      cobertura ?? empresa.vencimentoPlano,
      agora,
      promovivel,
      { confirmarTerminal: false },
    );

    if (terminal) {
      avisos.push(
        "Assinatura cancelada no Asaas: cancelamento terminal exige confirmacao explicita.",
      );
    }
    if (conferencia.pendente) {
      avisos.push(
        "Historico do Asaas indisponivel: nada e promovido nem estendido.",
      );
    }
    if (!conferencia.confirmado) {
      avisos.push(
        "Sem PAYMENT_RECEIVED comprovado: o plano nao sobe para ATIVO.",
      );
    }

    const vencimentoProposto = avancarVencimentoSeMaior(
      empresa.vencimentoPlano,
      cobertura,
    );

    return montarPayload(
      "vinculada",
      {
        asaas: {
          customer: { id: ctxCustomer, situacao: ctxCustomer ? "existente" : "ausente" },
          assinatura: {
            id: sub.id,
            situacao: "existente",
            status: sub.status ?? null,
            valor: typeof sub.value === "number" ? sub.value : null,
            ciclo: sub.cycle ?? null,
            total: 1,
            candidatos: [resumirAssinatura(sub)],
          },
          pagamento: {
            recebido: conferencia.confirmado,
            fonte: conferencia.fonte,
            coberturaAte: iso(cobertura),
            pendente: conferencia.pendente,
          },
        },
        proposta: {
          acao: "sincronizar",
          statusAtual: empresa.status,
          statusProposto,
          statusAsaasTerminal: terminal,
          requerConfirmacaoTerminal: terminal,
          requerConfirmacaoTermos: false,
          vencimentoAtual: iso(empresa.vencimentoPlano),
          vencimentoProposto: iso(vencimentoProposto),
          liberaAcesso: promovivel && statusProposto === "ATIVO",
        },
      },
      {
        empresaId,
        status: empresa.status,
        vencimento: iso(empresa.vencimentoPlano),
        customer: ctxCustomer,
        assinatura: {
          id: sub.id,
          status: sub.status ?? null,
          valor: sub.value ?? null,
          ciclo: sub.cycle ?? null,
          nextDueDate: sub.nextDueDate ?? null,
        },
        pagamento: {
          recebido: conferencia.confirmado,
          pendente: conferencia.pendente,
          cobertura: iso(cobertura),
        },
        acao: "sincronizar",
      },
    );
  }

  // ---------- empresa sem assinatura vinculada ----------
  const semDocumento = !empresa.cpfCnpj;
  if (semDocumento) {
    avisos.push("Empresa sem CPF/CNPJ: nao e possivel provisionar no Asaas.");
  }
  if (!emailAdminValidado) {
    avisos.push("Empresa sem email de admin: customer no Asaas exige email.");
  }

  let assinaturas: AssinaturaAsaas[] | null = [];
  if (customerId) {
    assinaturas = await asaas.listSubscriptionsByCustomer(customerId);
    if (assinaturas === null) {
      return {
        ok: false,
        http: 502,
        erro: "falha_consulta_asaas",
        motivo: "lista_assinaturas_falhou",
      };
    }
  }

  const classificacao = classificarAssinaturas(assinaturas);
  const candidatos =
    classificacao.tipo === "conflito"
      ? classificacao.candidatos.map(resumirAssinatura)
      : classificacao.tipo === "unica"
        ? [resumirAssinatura(classificacao.candidata)]
        : [];

  const assinaturaResumo = {
    id:
      classificacao.tipo === "unica" ? classificacao.candidata.id : null,
    situacao:
      classificacao.tipo === "unica"
        ? ("existente" as const)
        : classificacao.tipo === "conflito"
          ? ("multipla" as const)
          : ("ausente" as const),
    status:
      classificacao.tipo === "unica"
        ? (classificacao.candidata.status ?? null)
        : null,
    valor:
      classificacao.tipo === "unica" && typeof classificacao.candidata.value === "number"
        ? classificacao.candidata.value
        : null,
    ciclo:
      classificacao.tipo === "unica"
        ? (classificacao.candidata.cycle ?? null)
        : null,
    total: classificacao.total,
    candidatos,
  };

  const estadoBase = {
    empresaId,
    status: empresa.status,
    vencimento: iso(empresa.vencimentoPlano),
    ciclo: empresa.ciclo,
    cupom: empresa.cupomAplicado,
    customer: customerId,
    assinaturas: candidatos,
    classificacao: classificacao.tipo,
    adminId: adminSelecionado?.id ?? null,
  };

  // Conflito: nunca escolher sozinho, nunca criar por cima.
  if (classificacao.tipo === "conflito") {
    return montarPayload(
      "conflito",
      {
        asaas: {
          customer: { id: customerId, situacao: customerSituacao },
          assinatura: assinaturaResumo,
          pagamento: {
            recebido: false,
            fonte: "nenhuma",
            coberturaAte: null,
            pendente: false,
          },
        },
        proposta: {
          acao: "vincular_assinatura",
          statusAtual: empresa.status,
          statusProposto: empresa.status,
          statusAsaasTerminal: false,
          requerConfirmacaoTerminal: false,
          requerConfirmacaoTermos: false,
          vencimentoAtual: iso(empresa.vencimentoPlano),
          vencimentoProposto: null,
          liberaAcesso: false,
        },
        conflito: {
          motivo:
            classificacao.motivo === "multipla"
              ? "multiplas_assinaturas_no_customer"
              : "assinatura_unica_inativa",
          candidatos,
        },
      },
      estadoBase,
    );
  }

  if (semDocumento || (!customerId && !emailAdminValidado)) {
    const motivo = semDocumento ? "sem_documento" : "sem_email_admin";
    return montarPayload(
      "conflito",
      {
        asaas: {
          customer: { id: customerId, situacao: customerSituacao },
          assinatura: assinaturaResumo,
          pagamento: {
            recebido: false,
            fonte: "nenhuma",
            coberturaAte: null,
            pendente: false,
          },
        },
        proposta: {
          acao: "criar_assinatura",
          statusAtual: empresa.status,
          statusProposto: empresa.status,
          statusAsaasTerminal: false,
          requerConfirmacaoTerminal: false,
          requerConfirmacaoTermos: false,
          vencimentoAtual: iso(empresa.vencimentoPlano),
          vencimentoProposto: null,
          liberaAcesso: false,
        },
        conflito: { motivo, candidatos: [] },
      },
      estadoBase,
    );
  }

  // ---------- reuso de assinatura existente (sem duplicar) ----------
  if (classificacao.tipo === "unica") {
    const candidata = classificacao.candidata;
    const historico = await asaas.listPaymentHistory(candidata.id);
    const conferencia = await conferirPagamentoConfirmado(
      {
        asaasCustomerId: customerId,
        asaasSubscriptionId: candidata.id,
        status: empresa.status,
        vencimentoPlano: empresa.vencimentoPlano,
      },
      async () => historico,
      agora,
    );
    const cobertura = coberturaComprovada(historico, {
      customerId,
      subscriptionId: candidata.id,
      agora,
    });

    const promovivel = podePromover(conferencia.confirmado, cobertura, agora);

    if (!promovivel) {
      avisos.push(
        "Assinatura existente sem PAYMENT_RECEIVED vigente: vincular nao libera acesso.",
      );
    }

    return montarPayload(
      "provisionamento",
      {
        asaas: {
          customer: { id: customerId, situacao: customerSituacao },
          assinatura: assinaturaResumo,
          pagamento: {
            recebido: conferencia.confirmado,
            fonte: conferencia.fonte,
            coberturaAte: iso(cobertura),
            pendente: conferencia.pendente,
          },
        },
        proposta: {
          acao: "vincular_assinatura",
          statusAtual: empresa.status,
          statusProposto: empresa.status,
          statusAsaasTerminal: false,
          requerConfirmacaoTerminal: false,
          requerConfirmacaoTermos: false,
          vencimentoAtual: iso(empresa.vencimentoPlano),
          vencimentoProposto: iso(
            avancarVencimentoSeMaior(empresa.vencimentoPlano, cobertura),
          ),
          liberaAcesso: promovivel,
        },
      },
      {
        ...estadoBase,
        pagamento: {
          recebido: conferencia.confirmado,
          pendente: conferencia.pendente,
          cobertura: iso(cobertura),
        },
        acao: "vincular_assinatura",
      },
    );
  }

  // ---------- criacao (0 assinatura) ----------
  if (empresa.ciclo !== "MENSAL") {
    return {
      ok: false,
      http: 409,
      erro: "conflito_vinculo",
      motivo: "ciclo_nao_suportado",
    };
  }

  const valor = await resolverValor(empresa.cupomAplicado);
  if (!valor.ok) {
    return { ok: false, http: 409, erro: "conflito_vinculo", motivo: valor.motivo };
  }

  let primeiroVencimento: string;
  if (primeiroVencimentoOpt !== undefined && primeiroVencimentoOpt !== null) {
    if (
      typeof primeiroVencimentoOpt !== "string" ||
      !validarFormatoDataIso(primeiroVencimentoOpt)
    ) {
      return {
        ok: false,
        http: 400,
        erro: "primeiro_vencimento_invalido",
        motivo: "formato_data_invalido",
      };
    }
    const hojeIso = dataHojeSaoPaulo(agora);
    if (primeiroVencimentoOpt < hojeIso) {
      return {
        ok: false,
        http: 400,
        erro: "primeiro_vencimento_invalido",
        motivo: "data_retroativa",
      };
    }
    primeiroVencimento = primeiroVencimentoOpt;
  } else {
    primeiroVencimento = calcularVencimentoTrial(agora)
      .toISOString()
      .slice(0, 10);
  }

  const proposta = montarProposta({
    valor: valor.valor,
    ciclo: "MONTHLY",
    billingType: "UNDEFINED",
    primeiroVencimento,
    hoje: agora,
  });
  if (!proposta.ok) {
    return { ok: false, http: 409, erro: "conflito_vinculo", motivo: proposta.motivo };
  }

  if (empresa.cupomAplicado) {
    avisos.push(
      `Valor considera o cupom ${empresa.cupomAplicado} aplicado no cadastro.`,
    );
  }

  return montarPayload(
    "provisionamento",
    {
      asaas: {
        customer: { id: customerId, situacao: customerSituacao },
        assinatura: assinaturaResumo,
        pagamento: {
          recebido: false,
          fonte: "nenhuma",
          coberturaAte: null,
          pendente: false,
        },
      },
      proposta: {
        acao: "criar_assinatura",
        statusAtual: empresa.status,
        statusProposto: empresa.status,
        statusAsaasTerminal: false,
        requerConfirmacaoTerminal: false,
        requerConfirmacaoTermos: true,
        vencimentoAtual: iso(empresa.vencimentoPlano),
        vencimentoProposto: null,
        liberaAcesso: false,
      },
      provisionamento: {
        criarCustomer: !customerId,
        criarAssinatura: true,
        valor: proposta.proposta.valor,
        ciclo: proposta.proposta.ciclo,
        billingType: proposta.proposta.billingType,
        primeiroVencimento: proposta.proposta.primeiroVencimento,
        adminId: adminSelecionado?.id ?? null,
      },
    },
    {
      ...estadoBase,
      acao: "criar_assinatura",
      valor: proposta.proposta.valor,
      cicloProposta: proposta.proposta.ciclo,
      primeiroVencimento: proposta.proposta.primeiroVencimento,
      adminId: adminSelecionado?.id ?? null,
    },
  );
}

export interface ArgsConfirmacao {
  empresaId: string;
  token?: string | null;
  /** Cancelamento terminal so com esta flag explicita. */
  confirmarTerminal?: boolean;
  /** Criacao de customer/assinatura exige aceite dos termos do preview. */
  confirmarTermos?: boolean;
  agora?: Date;
  primeiroVencimento?: string | null;
  adminId?: string | null;
}

/**
 * Aplica o preview. Revalida tudo (snapshot + token) antes de qualquer escrita.
 */
export async function aplicarConfirmacao(
  args: ArgsConfirmacao,
): Promise<ResultadoConfirmacao> {
  const segredo = segredoPreview();
  if (!segredo) {
    return { http: 503, body: { ok: false, erro: "segredo_preview_ausente" } };
  }

  const agora = args.agora ?? new Date();
  const atual = await montarPreview(args.empresaId, {
    agora,
    primeiroVencimento: args.primeiroVencimento,
    adminId: args.adminId,
  });
  if (!atual.ok) {
    return {
      http: atual.http,
      body: { ok: false, erro: atual.erro, motivo: atual.motivo },
    };
  }

  const preview = atual.preview;
  const verif = verificarTokenPreview(args.token, {
    segredo,
    empresaId: args.empresaId,
    modo: preview.modo,
    versao: preview.versao,
    agora,
  });

  if (!verif.ok) {
    return {
      http: 409,
      body: { ok: false, erro: "preview_invalido", motivo: verif.motivo },
    };
  }

  if (preview.modo === "conflito") {
    return {
      http: 409,
      body: {
        ok: false,
        erro: "conflito_vinculo",
        conflito: preview.conflito ?? null,
      },
    };
  }

  // ---------- empresa vinculada: sincronizar status/vencimento ----------
  if (preview.modo === "vinculada") {
    if (preview.proposta.requerConfirmacaoTerminal && args.confirmarTerminal !== true) {
      return {
        http: 409,
        body: {
          ok: false,
          erro: "confirmacao_terminal_necessaria",
          statusAsaas: preview.asaas.assinatura.status,
        },
      };
    }

    const promovivel = podePromover(
      preview.asaas.pagamento.recebido,
      preview.asaas.pagamento.coberturaAte
        ? new Date(preview.asaas.pagamento.coberturaAte)
        : null,
      agora,
    );
    const statusFinal = decidirStatusSincronizado(
      preview.empresa.status,
      preview.asaas.assinatura.status ?? "",
      preview.asaas.pagamento.coberturaAte ?? preview.empresa.vencimentoPlano,
      agora,
      promovivel,
      { confirmarTerminal: args.confirmarTerminal === true },
    );

    const data: Record<string, unknown> = {};
    if (statusFinal !== preview.empresa.status) data.status = statusFinal;
    if (preview.proposta.vencimentoProposto) {
      data.vencimentoPlano = new Date(preview.proposta.vencimentoProposto);
    }
    if (!preview.empresa.documentoMascarado && !preview.asaas.customer.id) {
      return {
        http: 409,
        body: { ok: false, erro: "conflito_vinculo", motivo: "sem_documento" },
      };
    }

    if (Object.keys(data).length === 0) {
      return {
        http: 200,
        body: {
          ok: true,
          modo: preview.modo,
          aplicado: false,
          statusFinal,
          vencimentoPlano: preview.empresa.vencimentoPlano,
        },
      };
    }

    const atualizada = await prisma.empresa.update({
      where: { id: args.empresaId },
      data,
    });

    return {
      http: 200,
      body: {
        ok: true,
        modo: preview.modo,
        aplicado: true,
        statusFinal: atualizada.status,
        vencimentoPlano: iso(atualizada.vencimentoPlano),
      },
    };
  }

  // ---------- provisionamento: criar/vincular customer e assinatura ----------
  if (preview.proposta.requerConfirmacaoTermos && args.confirmarTermos !== true) {
    return {
      http: 409,
      body: {
        ok: false,
        erro: "confirmacao_termos_necessaria",
        provisionamento: preview.provisionamento ?? null,
      },
    };
  }

  // `proposta` so existe quando ha criacao; no reuso de assinatura existente o
  // preview ja informa a assinatura a vincular.
  const proposta = preview.provisionamento;
  const assinaturaExistente = preview.asaas.assinatura.id;
  if (!proposta && !assinaturaExistente) {
    return {
      http: 409,
      body: { ok: false, erro: "conflito_vinculo", motivo: "proposta_ausente" },
    };
  }

  const empresa = await carregarEmpresa(args.empresaId);
  if (!empresa) {
    return { http: 404, body: { ok: false, erro: "empresa_nao_encontrada" } };
  }

  let customerId = preview.asaas.customer.id;
  let criouCustomer = false;

  if (!customerId) {
    if (!empresa.cpfCnpj) {
      return {
        http: 409,
        body: { ok: false, erro: "conflito_vinculo", motivo: "sem_documento" },
      };
    }
    const email = preview.empresa.adminEmail;
    if (!email) {
      return {
        http: 409,
        body: { ok: false, erro: "conflito_vinculo", motivo: "sem_email_admin" },
      };
    }

    try {
      const criado = await asaas.createCustomer(
        empresa.nome,
        empresa.cpfCnpj,
        email,
        empresa.telefone ?? undefined,
        empresa.enderecoLogradouro && empresa.enderecoNumero && empresa.enderecoBairro && empresa.enderecoCep
          ? {
              logradouro: empresa.enderecoLogradouro,
              numero: empresa.enderecoNumero,
              bairro: empresa.enderecoBairro,
              cep: empresa.enderecoCep,
            }
          : undefined,
      );
      customerId = criado.id;
      criouCustomer = true;
    } catch {
      // Falha de POST pode ter criado: reconsultar antes de desistir.
      const relista = await asaas.buscarCustomerPorCpfCnpj(empresa.cpfCnpj);
      if (!relista.ok || !relista.customer) {
        return {
          http: 502,
          body: {
            ok: false,
            erro: "falha_asaas",
            motivo: "criacao_customer_incerta",
          },
        };
      }
      customerId = relista.customer.id;
    }
  }

  if (!empresa.asaasCustomerId) {
    const claimCustomer = await prisma.empresa.updateMany({
      where: { id: args.empresaId, asaasCustomerId: null },
      data: { asaasCustomerId: customerId },
    });
    if (claimCustomer.count !== 1) {
      return {
        http: 409,
        body: {
          ok: false,
          erro: "conflito_vinculo",
          motivo: "customer_ja_vinculado_por_outra_execucao",
        },
      };
    }
  }

  // Reconsulta SEMPRE antes de criar: concorrencia e timeout nao duplicam.
  const existentes = await asaas.listSubscriptionsByCustomer(customerId);
  if (existentes === null) {
    return {
      http: 502,
      body: { ok: false, erro: "falha_consulta_asaas", motivo: "lista_assinaturas_falhou" },
    };
  }

  const classificacao = classificarAssinaturas(existentes);
  if (classificacao.tipo === "conflito") {
    return {
      http: 409,
      body: {
        ok: false,
        erro: "conflito_vinculo",
        motivo:
          classificacao.motivo === "multipla"
            ? "multiplas_assinaturas_no_customer"
            : "assinatura_unica_inativa",
      },
    };
  }

  let subscriptionId: string | null =
    classificacao.tipo === "unica" ? classificacao.candidata.id : null;
  let criouAssinatura = false;

  if (!subscriptionId) {
    if (!proposta) {
      return {
        http: 409,
        body: { ok: false, erro: "conflito_vinculo", motivo: "proposta_ausente" },
      };
    }
    try {
      const criada = await asaas.createSubscription(
        customerId,
        proposta.valor,
        {
          dueDate: new Date(`${proposta.primeiroVencimento}T00:00:00.000Z`),
          billingType: proposta.billingType,
        },
      );
      subscriptionId = criada.id;
      criouAssinatura = true;
    } catch {
      const relista = await asaas.listSubscriptionsByCustomer(customerId);
      if (relista === null) {
        return {
          http: 502,
          body: { ok: false, erro: "falha_consulta_asaas", motivo: "reconsulta_pos_criacao_falhou" },
        };
      }
      const reclassificada = classificarAssinaturas(relista);
      if (reclassificada.tipo !== "unica") {
        return {
          http: 502,
          body: {
            ok: false,
            erro: "criacao_assinatura_incerta",
            motivo: "reconsulte_o_preview_antes_de_confirmar",
          },
        };
      }
      subscriptionId = reclassificada.candidata.id;
    }
  }

  if (!empresa.asaasSubscriptionId) {
    const claimSub = await prisma.empresa.updateMany({
      where: { id: args.empresaId, asaasSubscriptionId: null },
      data: { asaasSubscriptionId: subscriptionId },
    });
    if (claimSub.count !== 1) {
      return {
        http: 409,
        body: {
          ok: false,
          erro: "conflito_vinculo",
          motivo: "assinatura_ja_vinculada_por_outra_execucao",
        },
      };
    }
  }

  // Nunca libera por existir assinatura: so PAYMENT_RECEIVED provado.
  const historico = await asaas.listPaymentHistory(subscriptionId);
  const conferencia = await conferirPagamentoConfirmado(
    {
      asaasCustomerId: customerId,
      asaasSubscriptionId: subscriptionId,
      status: empresa.status,
      vencimentoPlano: empresa.vencimentoPlano,
    },
    async () => historico,
    agora,
  );
  const cobertura = coberturaComprovada(historico, {
    customerId,
    subscriptionId,
    agora,
  });

  // Provisionar NAO mexe no status: so PAYMENT_RECEIVED provado promove.
  const statusFinal = podePromover(conferencia.confirmado, cobertura, agora)
    ? "ATIVO"
    : empresa.status;
  const vencFinal = avancarVencimentoSeMaior(empresa.vencimentoPlano, cobertura);

  const atualizada = await prisma.empresa.update({
    where: { id: args.empresaId },
    data: {
      status: statusFinal,
      ...(vencFinal ? { vencimentoPlano: vencFinal } : {}),
    },
  });

  return {
    http: 200,
    body: {
      ok: true,
      modo: preview.modo,
      aplicado: true,
      criouCustomer,
      criouAssinatura,
      statusFinal: atualizada.status,
      vencimentoPlano: iso(atualizada.vencimentoPlano),
      pagamentoComprovado: conferencia.confirmado,
    },
  };
}
