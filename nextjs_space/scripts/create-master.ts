
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];
  const password = process.argv[3];
  const nome = process.argv[4] || 'Master Admin';

  if (!email || !password) {
    console.log('❌ Uso: yarn tsx scripts/create-master.ts <email> <senha> [nome]');
    console.log('   Exemplo: yarn tsx scripts/create-master.ts master@email.com senha123 "Admin Master"');
    process.exit(1);
  }

  console.log('🚀 Criando usuário master...\n');

  try {
    // Verificar se já existe um usuário com esse email
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      console.log('❌ Já existe um usuário com este email.');
      process.exit(1);
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(password, 10);

    // Criar usuário master (sem empresaId pois master não pertence a nenhuma empresa)
    const master = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        nome,
        name: nome,
        role: 'master',
        empresaId: null, // Master não tem empresa
      },
    });

    console.log('✅ Usuário master criado com sucesso!\n');
    console.log('📋 Detalhes:');
    console.log(`   Email: ${master.email}`);
    console.log(`   Nome: ${master.nome}`);
    console.log(`   Role: ${master.role}`);
    console.log(`   ID: ${master.id}\n`);
    console.log('🔑 Use estas credenciais para fazer login:\n');
    console.log(`   Email: ${master.email}`);
    console.log(`   Senha: ${password}\n`);
  } catch (error) {
    console.error('❌ Erro ao criar usuário master:', error);
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
