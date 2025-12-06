import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { generateVerificationToken } from "@/lib/tokens";
import { sendVerificationEmail } from "@/lib/mail";
import { Prisma } from "@prisma/client";
import { asaas } from "@/lib/asaas";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // Separe email para permitir reatribuição, use const para os outros
    let { email } = body;
    const { password, nome, nomeEmpresa, telefone, cpfCnpj } = body;

    if (email) {
      email = email.toLowerCase();
    }

    // Validações
    if (!email || !password || !nome || !nomeEmpresa || !cpfCnpj) {
      return NextResponse.json(
        { error: "Email, senha, nome, nome da empresa e CPF/CNPJ são obrigatórios" },
        { status: 400 }
      );
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Formato de email inválido" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Senha deve ter no mínimo 6 caracteres" },
        { status: 400 }
      );
    }

    // Verificar se o usuário já existe
    console.log("Verificando se usuário existe:", email);
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      console.log("Usuário já existe");
      return NextResponse.json(
        { error: "Já existe uma conta com este email" },
        { status: 400 }
      );
    }

    // Hash da senha
    console.log("Gerando hash da senha");
    const hashedPassword = await bcrypt.hash(password, 10);

    // --- INTEGRACAO ASAAS ---
    console.log("Iniciando integração com Asaas...");
    let asaasCustomer;
    let asaasSubscription;

    try {
      // 1. Criar Cliente
      asaasCustomer = await asaas.createCustomer(nomeEmpresa, cpfCnpj, email, telefone);
      console.log("Cliente Asaas criado:", asaasCustomer.id);

      // 2. Criar Assinatura (Trial)
      asaasSubscription = await asaas.createSubscription(asaasCustomer.id);
      console.log("Assinatura Asaas criada:", asaasSubscription.id);
    } catch (asaasError: any) {
      console.error("Erro na integração Asaas:", asaasError);
      return NextResponse.json(
        { error: "Erro ao configurar pagamento: " + asaasError.message },
        { status: 400 }
      );
    }

    // Criar empresa EM_TESTE + Admin em transação
    console.log("Iniciando transação de criação local");
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Calcular vencimento (Hoje + Trial Days)
      const trialDays = parseInt(process.env.NEXT_PUBLIC_TRIAL_DAYS || "14", 10);
      const vencimento = new Date();
      vencimento.setDate(vencimento.getDate() + trialDays);

      // 1. Criar empresa
      console.log("Criando empresa:", nomeEmpresa);
      const empresa = await tx.empresa.create({
        data: {
          nome: nomeEmpresa,
          telefone,
          cpfCnpj,
          status: "EM_TESTE",
          vencimentoPlano: vencimento,
          asaasCustomerId: asaasCustomer.id,
          asaasSubscriptionId: asaasSubscription.id,
        },
      });
      console.log("Empresa criada:", empresa.id);

      // 2. Criar usuário admin da empresa
      console.log("Criando usuário admin:", email);
      const admin = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          name: nome,
          nome,
          role: "admin", // Primeiro usuário é admin
          empresaId: empresa.id,
        },
      });
      console.log("Usuário admin criado:", admin.id);

      return { empresa, admin };
    });

    console.log("Transação concluída com sucesso");

    // Enviar email de verificação
    try {
      const verificationToken = await generateVerificationToken(email);
      await sendVerificationEmail(email, verificationToken.token);
    } catch (emailError) {
      console.error("Erro ao enviar email de verificação:", emailError);
      // Não falhar o cadastro se o email falhar, mas logar o erro
    }

    return NextResponse.json({
      success: true,
      message:
        "Cadastro realizado com sucesso! Seu período de teste de 14 dias começou.",
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
  } catch (error: any) {
    console.error("Erro detalhado ao criar cadastro:", error);
    if (error instanceof Error) {
      console.error(error.stack);
    }

    // Retornar mensagem de erro mais específica
    let errorMessage = "Erro ao criar conta e empresa";

    if (error.code === "P2002") {
      errorMessage = "Este email já está cadastrado no sistema";
    } else if (error.message) {
      errorMessage = error.message;
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
