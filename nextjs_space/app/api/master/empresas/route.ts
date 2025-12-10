import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { asaas } from "@/lib/asaas";
import bcrypt from "bcryptjs";

// GET - Listar todas as empresas (apenas master)
export async function GET() {
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
        sales: {
          select: {
            valorTotal: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Calcular faturamento total, mensal e formatar resposta
    const empresasFormatadas = empresas.map((empresa) => {
      const faturamentoTotal = empresa.sales.reduce(
        (acc, sale) => acc + Number(sale.valorTotal),
        0
      );

      const faturamentoMensal = empresa.sales.reduce((acc, sale) => {
        const saleDate = new Date(sale.createdAt);
        if (
          saleDate.getMonth() === currentMonth &&
          saleDate.getFullYear() === currentYear
        ) {
          return acc + Number(sale.valorTotal);
        }
        return acc;
      }, 0);

      // Remover o array de sales para não pesar o JSON
      const { _count, ...rest } = empresa;

      return {
        ...rest,
        faturamentoTotal,
        faturamentoMensal,
        totalProdutos: _count.products,
        totalVendas: _count.sales,
        _count, // Mantendo _count caso o frontend ainda use para users
      };
    });

    return NextResponse.json(empresasFormatadas);
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
    const {
      nomeEmpresa,
      adminEmail,
      adminSenha,
      adminNome,
      telefone,
      diaVencimento,
      cpfCnpj,
      cep,
      logradouro,
      numero,
      bairro,
      cidade,
      estado,
    } = body;

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
          telefone: telefone || null,
          diaVencimento: diaVencimento ? parseInt(diaVencimento) : 10,
          cpfCnpj: cpfCnpj ? cpfCnpj.replace(/\D/g, "") : null,
          enderecoCep: cep,
          enderecoLogradouro: logradouro,
          enderecoNumero: numero,
          enderecoBairro: bairro,
          enderecoCidade: cidade,
          enderecoUf: estado,
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

    // Cancelar assinatura e cliente no Asaas antes de excluir
    // FIX: Blindagem total contra erros do Asaas para não impedir exclusão local
    if (empresa.asaasSubscriptionId) {
      try {
        // Tenta cancelar, mas se falhar (ex: já cancelada), segue o jogo
        await asaas.cancelSubscription(empresa.asaasSubscriptionId);
        console.log(
          `✅ Assinatura ${empresa.asaasSubscriptionId} cancelada no Asaas`
        );
      } catch (asaasError: any) {
        // Loga mas não joga erro pra cima
        console.warn(
          `⚠️ Ignorando erro ao cancelar assinatura Asaas (${empresa.asaasSubscriptionId}):`,
          asaasError.message || asaasError
        );
      }
    }

    if (empresa.asaasCustomerId) {
      try {
        await asaas.deleteCustomer(empresa.asaasCustomerId);
        console.log(`✅ Cliente ${empresa.asaasCustomerId} deletado do Asaas`);
      } catch (asaasError: any) {
        // Loga mas não joga erro pra cima
        console.warn(
          `⚠️ Ignorando erro ao deletar cliente Asaas (${empresa.asaasCustomerId}):`,
          asaasError.message || asaasError
        );
      }
    }

    // Excluir empresa e todos os dados relacionados em uma transação
    await prisma.$transaction(async (tx: any) => {
      // 1. Excluir movimentações de estoque
      await tx.movimentacaoEstoque.deleteMany({
        where: { empresaId },
      });

      // 1.1 Excluir cancelamentos (feedback)
      await tx.cancelamento.deleteMany({
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

      // 5.5. Excluir Movimentações de Caixa (antes de excluir Caixas e Usuários)
      // FIX CRÍTICO: Deletar tanto por Caixas da empresa quanto por Usuários da empresa
      // para evitar erro de FK (RESTRICT) ao deletar usuários.

      const companyUsers = await tx.user.findMany({
        where: { empresaId },
        select: { id: true },
      });
      const userIds = companyUsers.map((u: any) => u.id);

      const caixas = await tx.caixa.findMany({
        where: { empresaId },
        select: { id: true },
      });
      const caixaIds = caixas.map((c: any) => c.id);

      // Deletar movimentações vinculadas aos caixas OU aos usuários dessa empresa
      await tx.movimentacaoCaixa.deleteMany({
        where: {
          OR: [{ caixaId: { in: caixaIds } }, { usuarioId: { in: userIds } }],
        },
      });

      // 6. Excluir caixas
      await tx.caixa.deleteMany({
        where: { empresaId },
      });

      // 7. Excluir avisos (vinculados à empresa ou aos usuários)
      await tx.aviso.deleteMany({
        where: {
          OR: [
            { empresaId },
            { remetenteId: { in: userIds } },
            { destinatarioId: { in: userIds } },
          ],
        },
      });

      // 8. Excluir produtos
      await tx.product.deleteMany({
        where: { empresaId },
      });

      // 8.5 Excluir Categorias
      await tx.category.deleteMany({
        where: { empresaId },
      });

      // 9. Excluir usuários
      // O Prisma cuida de Account e Session via onDelete: Cascade no Schema
      await tx.user.deleteMany({
        where: { empresaId },
      });

      // 10. Excluir empresa
      await tx.empresa.delete({
        where: { id: empresaId },
      });
    });

    revalidatePath("/master/empresas");
    revalidatePath("/master");

    return NextResponse.json(
      { message: "Empresa excluída com sucesso" },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Erro ao excluir empresa:", error);
    return NextResponse.json(
      { error: `Erro ao excluir empresa: ${error.message || error}` },
      { status: 500 }
    );
  }
}
