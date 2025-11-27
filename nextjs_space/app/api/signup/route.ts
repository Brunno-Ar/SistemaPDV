import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, nome, nomeEmpresa } = body;

    // Validações
    if (!email || !password || !nome || !nomeEmpresa) {
      return NextResponse.json(
        { error: "Email, senha, nome e nome da empresa são obrigatórios" },
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
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Já existe uma conta com este email" },
        { status: 400 }
      );
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(password, 10);

    // Criar empresa PENDENTE + Admin em transação
    const result = await prisma.$transaction(async (tx: any) => {
      // 1. Criar empresa com status PENDENTE (aguardando aprovação do master)
      const empresa = await tx.empresa.create({
        data: {
          nome: nomeEmpresa,
          status: "PENDENTE", // Será aprovada pelo master
          // vencimentoPlano será definido quando aprovado
        },
      });

      // 2. Criar usuário admin da empresa
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

      return { empresa, admin };
    });

    return NextResponse.json({
      success: true,
      message:
        "Cadastro realizado com sucesso! Aguarde a aprovação do administrador para acessar o sistema.",
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
