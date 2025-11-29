import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  log: ["query", "info", "warn", "error"],
});

async function main() {
  console.log("🌱 Iniciando seed do banco de dados...");

  // Criar empresa de teste
  const empresa = await prisma.empresa.upsert({
    where: { id: "empresa-teste-001" },
    update: {},
    create: {
      id: "empresa-teste-001",
      nome: "Empresa PDV Teste",
    },
  });

  console.log("✅ Empresa criada!");

  // Criar usuários iniciais
  const adminPasswordHash = await bcrypt.hash("admin123", 10);
  const caixaPasswordHash = await bcrypt.hash("caixa123", 10);
  const masterPasswordHash = await bcrypt.hash("master123", 10);
  const defaultPasswordHash = await bcrypt.hash("johndoe123", 10);

  // Usuário Master
  await prisma.user.upsert({
    where: { email: "master@pdv.com" },
    update: {},
    create: {
      email: "master@pdv.com",
      name: "Master User",
      nome: "Master User",
      role: "master",
      password: masterPasswordHash,
      empresaId: empresa.id,
    },
  });

  // Usuário Admin
  await prisma.user.upsert({
    where: { email: "admin@pdv.com" },
    update: {},
    create: {
      email: "admin@pdv.com",
      name: "Administrador",
      nome: "Administrador",
      role: "admin",
      password: adminPasswordHash,
      empresaId: empresa.id,
    },
  });

  // Usuário Caixa
  await prisma.user.upsert({
    where: { email: "caixa@pdv.com" },
    update: {},
    create: {
      email: "caixa@pdv.com",
      name: "Usuário Caixa",
      nome: "Usuário Caixa",
      role: "caixa",
      password: caixaPasswordHash,
      empresaId: empresa.id,
    },
  });

  // Usuário de teste padrão (requerido pelo sistema)
  await prisma.user.upsert({
    where: { email: "john@doe.com" },
    update: {},
    create: {
      email: "john@doe.com",
      name: "John Doe",
      nome: "John Doe",
      role: "admin",
      password: defaultPasswordHash,
      empresaId: empresa.id,
    },
  });

  console.log("✅ Usuários criados!");

  // Criar produtos de exemplo
  const produtos = [
    {
      nome: "Coca-Cola 2L",
      sku: "COCA2L001",
      precoVenda: 8.5,
      estoqueAtual: 50,
    },
    {
      nome: "Pão Francês",
      sku: "PAOFR001",
      precoVenda: 0.6,
      estoqueAtual: 100,
    },
    {
      nome: "Leite Integral 1L",
      sku: "LEITE1L001",
      precoVenda: 4.8,
      estoqueAtual: 30,
    },
    {
      nome: "Arroz 5kg",
      sku: "ARROZ5K001",
      precoVenda: 15.9,
      estoqueAtual: 25,
    },
    {
      nome: "Feijão 1kg",
      sku: "FEIJAO1K001",
      precoVenda: 7.5,
      estoqueAtual: 40,
    },
    {
      nome: "Açúcar Cristal 1kg",
      sku: "ACUCAR1K001",
      precoVenda: 3.2,
      estoqueAtual: 35,
    },
    {
      nome: "Óleo de Soja 900ml",
      sku: "OLEO900ML001",
      precoVenda: 6.9,
      estoqueAtual: 20,
    },
    {
      nome: "Macarrão Espaguete 500g",
      sku: "MAC500G001",
      precoVenda: 3.5,
      estoqueAtual: 60,
    },
    {
      nome: "Sabonete Líquido",
      sku: "SABLIQ001",
      precoVenda: 4.25,
      estoqueAtual: 15,
    },
    {
      nome: "Papel Higiênico 4 rolos",
      sku: "PAPHIG4R001",
      precoVenda: 8.9,
      estoqueAtual: 45,
    },
    {
      nome: "Detergente 500ml",
      sku: "DET500ML001",
      precoVenda: 2.4,
      estoqueAtual: 30,
    },
    {
      nome: "Café 500g",
      sku: "CAFE500G001",
      precoVenda: 12.8,
      estoqueAtual: 18,
    },
  ];

  for (const produto of produtos) {
    // Verificar se o produto já existe
    const existingProduct = await prisma.product.findFirst({
      where: {
        sku: produto.sku,
        empresaId: empresa.id,
      },
    });

    let createdProduct;

    if (existingProduct) {
      createdProduct = await prisma.product.update({
        where: { id: existingProduct.id },
        data: {}, // Nada a atualizar no seed se já existe
      });
    } else {
      createdProduct = await prisma.product.create({
        data: {
          nome: produto.nome,
          sku: produto.sku,
          precoVenda: produto.precoVenda,
          precoCompra: produto.precoVenda * 0.6, // Custo estimado de 60%
          estoqueAtual: produto.estoqueAtual,
          empresaId: empresa.id,
        },
      });

      // Criar lote inicial APENAS se o produto acabou de ser criado
      await prisma.lote.create({
        data: {
          numeroLote: `LOTE-${produto.sku}-INI`,
          produtoId: createdProduct.id,
          quantidade: produto.estoqueAtual,
          precoCompra: produto.precoVenda * 0.6,
          dataValidade: new Date(
            new Date().setFullYear(new Date().getFullYear() + 1)
          ), // Validade de 1 ano
        },
      });
    }
  }

  console.log("✅ Produtos criados!");
  console.log("🎉 Seed concluído com sucesso!");
  console.log("");
  console.log("👤 Usuários criados:");
  console.log("   Master: master@pdv.com / master123");
  console.log("   Admin: admin@pdv.com / admin123");
  console.log("   Caixa: caixa@pdv.com / caixa123");
  console.log("");
  console.log(`📦 ${produtos.length} produtos adicionados ao estoque`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
