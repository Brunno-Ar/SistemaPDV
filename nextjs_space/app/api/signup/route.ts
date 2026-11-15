import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { generateVerificationToken } from "@/lib/tokens";
import { sendVerificationEmail } from "@/lib/mail";
import { Prisma } from "@prisma/client";
import { asaas } from "@/lib/asaas";
import {
  TRIAL_DAYS,
  calcularVencimentoTrial,
  PRECO_PLANO_PADRAO,
} from "@/lib/billing-policy";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  // Variáveis para rollback
  let createdAsaasCustomerId: string | null = null;
  let isNewCustomer = false;

  try {
    const body = await request.json();
    const cupom = body.cupom;
    const {
      password,
      nome,
      nomeEmpresa,
      telefone,
      cpfCnpj,
      termsAccepted,
      logradouro,
      numero,
      bairro,
      cep,
      cidade,
      uf,
    } = body;

    // Normalizar email para lowercase
    const email = body.email?.toLowerCase();

    // ========== VALIDAÇÕES ==========
    if (!termsAccepted) {
      return NextResponse.json(
        {
          error:
            "É necessário aceitar os Termos de Uso e Política de Privacidade",
        },
        { status: 400 },
      );
    }

    if (!email || !password || !nome || !nomeEmpresa || !cpfCnpj) {
      return NextResponse.json(
        {
          error:
            "Email, senha, nome, nome da empresa e CPF/CNPJ são obrigatórios",
        },
        { status: 400 },
      );
    }

    // Validar endereço completo para NF
    if (!logradouro || !numero || !bairro || !cep || !cidade || !uf) {
      return NextResponse.json(
        {
          error:
            "Endereço completo (Logradouro, Número, Bairro, CEP, Cidade, UF) é obrigatório para emissão de Nota Fiscal",
        },
        { status: 400 },
      );
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Formato de email inválido" },
        { status: 400 },
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Senha deve ter no mínimo 6 caracteres" },
        { status: 400 },
      );
    }

    // Limpar CPF/CNPJ (remover pontos, traços, barras)
    const cpfCnpjClean = cpfCnpj.replace(/[.\-\/]/g, "");

    // Validar tamanho do CPF/CNPJ
    if (cpfCnpjClean.length !== 11 && cpfCnpjClean.length !== 14) {
      return NextResponse.json(
        { error: "CPF deve ter 11 dígitos ou CNPJ deve ter 14 dígitos" },
        { status: 400 },
      );
    }

    // ========== VALIDAR CUPOM ==========
    let cupomDb: {
      codigo: string;
      descontoPorcentagem: number;
      validoAte: Date | null;
      usosAtuais: number;
      limiteUsos: number | null;
    } | null = null;
    let subscriptionPrice = PRECO_PLANO_PADRAO;

    if (cupom) {
      cupomDb = await prisma.cupom.findUnique({
        where: { codigo: cupom.toUpperCase() },
      });

      if (!cupomDb) {
        return NextResponse.json({ error: "Cupom inválido" }, { status: 400 });
      }

      const now = new Date();
      if (cupomDb.validoAte && cupomDb.validoAte < now) {
        return NextResponse.json(
          { error: "Este cupom expirou e não pode mais ser utilizado" },
          { status: 400 },
        );
      }

      if (
        cupomDb.limiteUsos !== null &&
        cupomDb.usosAtuais >= cupomDb.limiteUsos
      ) {
        return NextResponse.json(
          { error: "O limite de usos deste cupom foi atingido" },
          { status: 400 },
        );
      }

      // Aplicar desconto
      const originalPrice = subscriptionPrice;
      const desconto = cupomDb.descontoPorcentagem;
      subscriptionPrice = originalPrice * ((100 - desconto) / 100);
      subscriptionPrice = Number(subscriptionPrice.toFixed(2));
    }

    // ========== VERIFICAR DUPLICATAS ==========

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Já existe uma conta com este email" },
        { status: 400 },
      );
    }

    // Verificar se CPF/CNPJ já está cadastrado no sistema
    const existingEmpresa = await prisma.empresa.findFirst({
      where: { cpfCnpj: cpfCnpjClean },
    });

    if (existingEmpresa) {
      return NextResponse.json(
        { error: "Este CPF/CNPJ já está cadastrado no sistema" },
        { status: 400 },
      );
    }

    // Hash da senha

    const hashedPassword = await bcrypt.hash(password, 10);

    // ========== INTEGRAÇÃO ASAAS ==========
    // NOTA: Se o cupom for 100% (valor = 0), pulamos a integração Asaas
    // Conta será gratuita permanentemente
    const isFreeAccount = subscriptionPrice <= 0;

    let asaasCustomer:
      | { id: string; name: string; email: string; cpfCnpj: string }
      | undefined;
    let asaasSubscription:
      | {
          id: string;
          customerId: string;
          value: number;
          nextDueDate: string;
          cycle: string;
          status: string;
        }
      | undefined;

    if (!isFreeAccount) {
      try {
        // 1. Criar/Recuperar Cliente no Asaas
        const existingAsaasCustomer =
          await asaas.findCustomerByCpfCnpj(cpfCnpjClean);

        if (existingAsaasCustomer) {
          asaasCustomer = existingAsaasCustomer;
          isNewCustomer = false;
        } else {
          asaasCustomer = await asaas.createCustomer(
            nomeEmpresa,
            cpfCnpjClean,
            email,
            telefone,
            {
              logradouro,
              numero,
              bairro,
              cep,
              complemento: "", // Opcional
            },
          );

          createdAsaasCustomerId = asaasCustomer.id;
          isNewCustomer = true;
        }

        // 2. Criar Assinatura (com preço ajustado pelo cupom)
        asaasSubscription = await asaas.createSubscription(
          asaasCustomer.id,
          subscriptionPrice,
        );
      } catch (asaasError: unknown) {
        console.error("❌ Erro na integração Asaas:", asaasError);

        // ROLLBACK: Se criamos um cliente novo e ele falhou na assinatura, deletar
        if (createdAsaasCustomerId && isNewCustomer) {
          await asaas.deleteCustomer(createdAsaasCustomerId);
        }

        const errorMessage =
          asaasError instanceof Error
            ? asaasError.message
            : "Erro desconhecido";

        if (
          errorMessage.toLowerCase().includes("cpf") ||
          errorMessage.toLowerCase().includes("cnpj")
        ) {
          return NextResponse.json(
            { error: "CPF/CNPJ inválido. Verifique os dados informados." },
            { status: 400 },
          );
        }

        return NextResponse.json(
          { error: "Erro ao configurar pagamento: " + errorMessage },
          { status: 400 },
        );
      }

      // Ensure Asaas integration completed successfully
      if (!asaasCustomer || !asaasSubscription) {
        return NextResponse.json(
          { error: "Erro ao configurar pagamento. Tente novamente." },
          { status: 500 },
        );
      }
    } else {
    }

    // ========== CRIAR EMPRESA E ADMIN NO BANCO ==========

    try {
      const result = await prisma.$transaction(
        async (tx: Prisma.TransactionClient) => {
          // Para contas gratuitas: ATIVO sem vencimento
          // Para contas normais: EM_TESTE com trial de X dias
          let vencimento: Date | null = null;
          let status: "ATIVO" | "EM_TESTE" = "EM_TESTE";

          if (isFreeAccount) {
            // Cupom 100% (preço zero): NÃO cria ATIVO sem vencimento. Segue o
            // mesmo trial de 14 dias de qualquer novo cadastro, depois
            // pagamento obrigatório. Nunca concede acesso permanente.
            status = "EM_TESTE";
            vencimento = calcularVencimentoTrial();
          } else {
            // Conta normal: Trial de TRIAL_DAYS (lib/billing-policy), mesma
            // duração usada pela 1a cobrança no Asaas.
            vencimento = calcularVencimentoTrial();
          }

          // 1. Criar empresa

          const empresa = await tx.empresa.create({
            data: {
              nome: nomeEmpresa,
              telefone,
              cpfCnpj: cpfCnpjClean,
              status,
              plano: "PRO",
              vencimentoPlano: vencimento,
              asaasCustomerId: asaasCustomer?.id || null,
              asaasSubscriptionId: asaasSubscription?.id || null,

              // Endereço
              enderecoLogradouro: logradouro,
              enderecoNumero: numero,
              enderecoBairro: bairro,
              enderecoCidade: cidade,
              enderecoUf: uf,
              enderecoCep: cep,
              // Cupom
              cupomAplicado: cupom ? cupom.toUpperCase() : null,
            },
          });

          // 2. Criar usuário admin da empresa

          const admin = await tx.user.create({
            data: {
              email,
              password: hashedPassword,
              name: nome,
              nome,
              role: "admin",
              empresaId: empresa.id,
              tourCompleted: false,
            },
          });

          // 3. Incrementar uso do cupom (se aplicado)
          if (cupomDb) {
            await tx.cupom.update({
              where: { codigo: cupomDb.codigo },
              data: { usosAtuais: { increment: 1 } },
            });
          }

          // 4. Vincular indicação (Member Get Member)
          const refCode = body.ref;
          if (refCode && typeof refCode === "string") {
            const memberLink = await tx.memberLink.findUnique({
              where: { codigoURL: refCode },
            });

            if (memberLink && memberLink.ativo) {
              await tx.memberConversion.create({
                data: {
                  linkId: memberLink.id,
                  novaEmpresaId: empresa.id,
                  status: "TRIAL",
                },
              });
            }
          }

          return { empresa, admin };
        },
      );

      // Enviar email de verificação
      try {
        const verificationToken = await generateVerificationToken(email);
        await sendVerificationEmail(email, verificationToken.token);
      } catch (emailError) {
        console.warn("⚠️ Erro ao enviar email de verificação:", emailError);
      }

      return NextResponse.json({
        success: true,
        message: isFreeAccount
          ? "🎉 Conta criada com sucesso! Aproveite o sistema gratuitamente!"
          : `Cadastro realizado com sucesso! Seu período de teste de ${TRIAL_DAYS} dias começou.`,
        empresa: {
          id: result.empresa.id,
          nome: result.empresa.nome,
          status: result.empresa.status,
        },
        user: {
          id: result.admin.id,
          email: result.admin.email,
          name: result.admin.name,
          role: result.admin.role,
        },
      });
    } catch (dbError: unknown) {
      console.error("❌ Erro ao criar registros no banco:", dbError);

      // ROLLBACK: Cancelar assinatura e deletar cliente no Asaas

      if (asaasSubscription) {
        try {
          await asaas.cancelSubscription(asaasSubscription.id);
        } catch (e) {
          console.warn("⚠️ Falha ao cancelar assinatura:", e);
        }
      }

      if (isNewCustomer && createdAsaasCustomerId) {
        try {
          await asaas.deleteCustomer(createdAsaasCustomerId);
        } catch (e) {
          console.warn("⚠️ Falha ao deletar cliente:", e);
        }
      }

      throw dbError; // Re-throw para o catch externo
    }
  } catch (error: unknown) {
    console.error("❌ Erro detalhado ao criar cadastro:", error);

    // Tratamento de erros genérico
    let errorMessage = "Erro ao criar conta e empresa";

    if (typeof error === "object" && error !== null && "code" in error) {
      const prismaError = error as { code: string };
      if (prismaError.code === "P2002") {
        errorMessage = "Este email ou CPF/CNPJ já está cadastrado no sistema";
      }
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
