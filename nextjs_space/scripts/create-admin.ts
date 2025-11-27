
/**
 * Script para criar ou promover usuários para Admin
 * 
 * USO:
 * 1. Para promover um usuário existente para admin (por email):
 *    cd /home/ubuntu/pdv_system/nextjs_space && yarn tsx scripts/create-admin.ts promote usuario@email.com
 * 
 * 2. Para criar um novo usuário admin:
 *    cd /home/ubuntu/pdv_system/nextjs_space && yarn tsx scripts/create-admin.ts create "Nome" usuario@email.com senha123
 */

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function promoteToAdmin(email: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { email }
    })

    if (!user) {
      console.error(`❌ Usuário com email '${email}' não encontrado.`)
      process.exit(1)
    }

    if (user.role === 'admin') {
      console.log(`ℹ️  O usuário '${user.nome}' (${email}) já é Admin.`)
      process.exit(0)
    }

    await prisma.user.update({
      where: { email },
      data: { role: 'admin' }
    })

    console.log(`✅ Usuário '${user.nome}' (${email}) promovido para Admin com sucesso!`)
  } catch (error) {
    console.error('❌ Erro ao promover usuário:', error)
    process.exit(1)
  }
}

async function createAdmin(name: string, email: string, password: string) {
  try {
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      console.error(`❌ Já existe um usuário com o email '${email}'.`)
      console.log(`💡 Use o comando 'promote' para promovê-lo a Admin.`)
      process.exit(1)
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const user = await prisma.user.create({
      data: {
        email,
        name,
        nome: name,
        role: 'admin',
        password: hashedPassword
      }
    })

    console.log(`✅ Usuário Admin criado com sucesso!`)
    console.log(`   Nome: ${user.nome}`)
    console.log(`   Email: ${user.email}`)
    console.log(`   Senha: ${password}`)
    console.log(`   Role: ${user.role}`)
  } catch (error) {
    console.error('❌ Erro ao criar usuário admin:', error)
    process.exit(1)
  }
}

async function main() {
  const args = process.argv.slice(2)
  const command = args[0]

  if (!command) {
    console.log(`
📋 USO DO SCRIPT:

1️⃣  Promover usuário existente para Admin:
   yarn tsx scripts/create-admin.ts promote email@usuario.com

2️⃣  Criar novo usuário Admin:
   yarn tsx scripts/create-admin.ts create "Nome do Admin" email@usuario.com senha123

📝 EXEMPLOS:
   yarn tsx scripts/create-admin.ts promote caixa@pdv.com
   yarn tsx scripts/create-admin.ts create "Maria Silva" maria@pdv.com maria123
    `)
    process.exit(0)
  }

  if (command === 'promote') {
    const email = args[1]
    if (!email) {
      console.error('❌ Email é obrigatório.')
      console.log('💡 Uso: yarn tsx scripts/create-admin.ts promote email@usuario.com')
      process.exit(1)
    }
    await promoteToAdmin(email)
  } else if (command === 'create') {
    const name = args[1]
    const email = args[2]
    const password = args[3]

    if (!name || !email || !password) {
      console.error('❌ Nome, email e senha são obrigatórios.')
      console.log('💡 Uso: yarn tsx scripts/create-admin.ts create "Nome" email@usuario.com senha123')
      process.exit(1)
    }
    await createAdmin(name, email, password)
  } else {
    console.error(`❌ Comando '${command}' não reconhecido.`)
    console.log('💡 Use: promote ou create')
    process.exit(1)
  }

  await prisma.$disconnect()
}

main()
