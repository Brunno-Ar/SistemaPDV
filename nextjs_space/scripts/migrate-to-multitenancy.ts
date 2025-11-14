
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Iniciando migração para arquitetura multi-tenant...\n');

  try {
    // 1. Criar empresa padrão (Demo)
    console.log('📦 Criando empresa padrão...');
    const empresaDemo = await prisma.empresa.create({
      data: {
        nome: 'Empresa Demo',
      },
    });
    console.log(`✅ Empresa criada: ${empresaDemo.nome} (ID: ${empresaDemo.id})\n`);

    // 2. Atualizar todos os usuários existentes para pertencer à empresa demo
    const usersUpdated = await prisma.user.updateMany({
      where: {
        empresaId: null,
      },
      data: {
        empresaId: empresaDemo.id,
      },
    });
    console.log(`✅ ${usersUpdated.count} usuários atribuídos à empresa demo\n`);

    // 3. Atualizar todos os produtos existentes
    const productsUpdated = await prisma.product.updateMany({
      where: {
        empresaId: null,
      },
      data: {
        empresaId: empresaDemo.id,
      },
    });
    console.log(`✅ ${productsUpdated.count} produtos atribuídos à empresa demo\n`);

    // 4. Atualizar todas as vendas existentes
    const salesUpdated = await prisma.sale.updateMany({
      where: {
        empresaId: null,
      },
      data: {
        empresaId: empresaDemo.id,
      },
    });
    console.log(`✅ ${salesUpdated.count} vendas atribuídas à empresa demo\n`);

    console.log('✨ Migração concluída com sucesso!');
    console.log(`\n📊 Resumo:`);
    console.log(`   - Empresa criada: ${empresaDemo.nome}`);
    console.log(`   - Usuários migrados: ${usersUpdated.count}`);
    console.log(`   - Produtos migrados: ${productsUpdated.count}`);
    console.log(`   - Vendas migradas: ${salesUpdated.count}`);
  } catch (error) {
    console.error('❌ Erro durante a migração:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
