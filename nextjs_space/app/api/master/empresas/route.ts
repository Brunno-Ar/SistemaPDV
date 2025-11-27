import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

// GET - Listar todas as empresas (apenas master)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "master") {
      return NextResponse.json(
        { error: "Acesso negado. Apenas usuários master." },
        { status: 403 }
      );
    }

    const empresas = await prisma.empresa.findMany({
      include: {
        _count: {
          select: {
            users: true,
            products: true,
            sales: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(empresas);
  } catch (error) {
    console.error("Erro ao buscar empresas:", error);
    return NextResponse.json(
      { error: "Erro ao buscar empresas" },
      { status: 500 }
    );
  }
}

// POST - Criar nova empresa com primeiro admin (apenas master)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "master") {
      return NextResponse.json(
        { error: "Acesso negado. Apenas usuários master." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { nomeEmpresa, adminEmail, adminSenha, adminNome } = body;

    // Validações
    if (!nomeEmpresa || !adminEmail || !adminSenha) {
      return NextResponse.json(
        { error: "Nome da empresa, email e senha do admin são obrigatórios" },
        { status: 400 }
      );
    }

    // Verificar se já existe usuário com esse email
    const existingUser = await prisma.user.findUnique({
      where: { email: adminEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Já existe um usuário com este email" },
        { status: 400 }
      );
    }

    // Criar empresa e admin em uma transação
    const result = await prisma.$transaction(async (tx: any) => {
      // 1. Criar a empresa
      const empresa = await tx.empresa.create({
        data: {
          nome: nomeEmpresa,
        },
      });

      // 2. Hash da senha
      const hashedPassword = await bcrypt.hash(adminSenha, 10);

      // 3. Criar o usuário admin
      const admin = await tx.user.create({
        data: {
          email: adminEmail,
          password: hashedPassword,
          nome: adminNome || adminEmail.split("@")[0],
          name: adminNome || adminEmail.split("@")[0],
          role: "admin",
          empresaId: empresa.id,
        },
      });

      return { empresa, admin };
    });

    return NextResponse.json(
      {
        message: "Empresa e admin criados com sucesso",
        empresa: result.empresa,
        admin: {
          id: result.admin.id,
          email: result.admin.email,
          nome: result.admin.nome,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Erro ao criar empresa:", error);
    return NextResponse.json(
      { error: "Erro ao criar empresa" },
      { status: 500 }
    );
  }
}

// DELETE - Excluir empresa (apenas master)
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "master") {
      return NextResponse.json(
        { error: "Acesso negado. Apenas usuários master." },
        { status: 403 }
      );
    }

    // 🔥 FIX: Aceitar empresaId do body ao invés de query string
    const body = await request.json();
    const empresaId = body.empresaId;

    if (!empresaId) {
      return NextResponse.json(
        { error: "ID da empresa é obrigatório" },
        { status: 400 }
      );
    }

    // Verificar se a empresa existe
    const empresa = await prisma.empresa.findUnique({
      where: { id: empresaId },
    });

    if (!empresa) {
      return NextResponse.json(
        { error: "Empresa não encontrada" },
        { status: 404 }
      );
    }

    // Excluir empresa e todos os dados relacionados em uma transação
    await prisma.$transaction(async (tx: any) => {
      // 1. Excluir movimentações de estoque
      await tx.movimentacaoEstoque.deleteMany({
        where: { empresaId },
      });

      // 2. Buscar todos os produtos para deletar lotes
      const products = await tx.product.findMany({
        where: { empresaId },
        select: { id: true },
      });

      // 3. Excluir lotes dos produtos
      if (products.length > 0) {
        await tx.lote.deleteMany({
          where: {
            produtoId: { in: products.map((p: any) => p.id) },
          },
        });
      }

      // 4. Excluir itens de vendas
      const sales = await tx.sale.findMany({
        where: { empresaId },
        select: { id: true },
      });

      if (sales.length > 0) {
        await tx.saleItem.deleteMany({
          where: {
            saleId: { in: sales.map((s: any) => s.id) },
          },
        });
      }

      // 5. Excluir vendas
      await tx.sale.deleteMany({
        where: { empresaId },
      });

      // 6. Excluir caixas
      await tx.caixa.deleteMany({
        where: { empresaId },
      });

      // 7. Excluir avisos
      await tx.aviso.deleteMany({
        where: { empresaId },
      });

      // 8. Excluir produtos
      await tx.product.deleteMany({
        where: { empresaId },
      });

      // 9. Excluir usuários
      await tx.user.deleteMany({
        where: { empresaId },
      });

      // 10. Excluir empresa
      await tx.empresa.delete({
        where: { id: empresaId },
      });
    });

    return NextResponse.json(
      { message: "Empresa excluída com sucesso" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Erro ao excluir empresa:", error);
    return NextResponse.json(
      { error: "Erro ao excluir empresa" },
      { status: 500 }
    );
  }
}
