import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Start seeding...");

  // 0. Limpar banco de dados (ordem importa para evitar Foreign Key constraint)
  await prisma.salePayment.deleteMany();
  await prisma.saleItem.deleteMany();
  await prisma.sale.deleteMany();
  await prisma.movimentacaoEstoque.deleteMany();
  await prisma.movimentacaoCaixa.deleteMany();
  await prisma.caixa.deleteMany();
  await prisma.lote.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();
  await prisma.empresa.deleteMany();

  console.log("Database cleared.");

  // 1. Criar Empresa
  const empresa = await prisma.empresa.create({
    data: {
      nome: "Empresa Teste Ltda",
      status: "ATIVO",
      plano: "PRO",
      cpfCnpj: "00.000.000/0001-00",
      senhaAutorizacao: await bcrypt.hash("admin123", 10), // Senha de autorização padrão
    },
  });

  console.log(`Created company with id: ${empresa.id}`);

  // 2. Criar Usuários

  // Hashes individuais para cada senha
  const passMaster = await bcrypt.hash("master123", 10);
  const passAdmin = await bcrypt.hash("admin123", 10);
  const passGerente = await bcrypt.hash("gerente123", 10);
  const passCaixa = await bcrypt.hash("caixa123", 10);

  const master = await prisma.user.create({
    data: {
      name: "Master User",
      email: "master@pdv.com",
      password: passMaster,
      role: "master",
      empresaId: empresa.id,
      emailVerified: new Date(),
    },
  });

  const admin = await prisma.user.create({
    data: {
      name: "Admin User",
      email: "admin@pdv.com",
      password: passAdmin,
      role: "admin",
      empresaId: empresa.id,
      emailVerified: new Date(),
    },
  });

  const gerente = await prisma.user.create({
    data: {
      name: "Gerente User",
      email: "gerente@pdv.com",
      password: passGerente,
      role: "gerente",
      empresaId: empresa.id,
      emailVerified: new Date(),
    },
  });

  const caixa = await prisma.user.create({
    data: {
      name: "Caixa User",
      email: "caixa@pdv.com",
      password: passCaixa,
      role: "caixa",
      empresaId: empresa.id,
      emailVerified: new Date(),
    },
  });

  console.log("Created users: master, admin, gerente, caixa");

  // 3. Criar Categoria
  const categoria = await prisma.category.create({
    data: {
      nome: "Geral",
      empresaId: empresa.id,
    },
  });

  // 4. Criar Produtos
  await prisma.product.create({
    data: {
      nome: "Produto Exemplo A",
      sku: "PROD-001",
      precoVenda: 50.0,
      precoCompra: 25.0,
      estoqueAtual: 100,
      estoqueMinimo: 10,
      empresaId: empresa.id,
      categoryId: categoria.id,
      lotes: {
        create: {
          numeroLote: "LOTE-001",
          quantidade: 100,
          precoCompra: 25.0,
          dataValidade: new Date(
            new Date().setFullYear(new Date().getFullYear() + 1)
          ),
        },
      },
    },
  });

  await prisma.product.create({
    data: {
      nome: "Produto Exemplo B",
      sku: "PROD-002",
      precoVenda: 120.0,
      precoCompra: 60.0,
      estoqueAtual: 50,
      estoqueMinimo: 5,
      empresaId: empresa.id,
      categoryId: categoria.id,
      lotes: {
        create: {
          numeroLote: "LOTE-002",
          quantidade: 50,
          precoCompra: 60.0,
          dataValidade: new Date(
            new Date().setFullYear(new Date().getFullYear() + 1)
          ),
        },
      },
    },
  });

  console.log("Seeding finished.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
