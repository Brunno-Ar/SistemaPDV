
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...')

  // Criar usuários iniciais
  const adminPasswordHash = await bcrypt.hash('admin123', 10)
  const caixaPasswordHash = await bcrypt.hash('caixa123', 10)
  const defaultPasswordHash = await bcrypt.hash('johndoe123', 10)

  // Usuário Admin
  await prisma.user.upsert({
    where: { email: 'admin@pdv.com' },
    update: {},
    create: {
      email: 'admin@pdv.com',
      name: 'Administrador',
      nome: 'Administrador',
      role: 'admin',
      password: adminPasswordHash,
    },
  })

  // Usuário Caixa
  await prisma.user.upsert({
    where: { email: 'caixa@pdv.com' },
    update: {},
    create: {
      email: 'caixa@pdv.com',
      name: 'Usuário Caixa',
      nome: 'Usuário Caixa',
      role: 'caixa',
      password: caixaPasswordHash,
    },
  })

  // Usuário de teste padrão (requerido pelo sistema)
  await prisma.user.upsert({
    where: { email: 'john@doe.com' },
    update: {},
    create: {
      email: 'john@doe.com',
      name: 'John Doe',
      nome: 'John Doe',
      role: 'admin',
      password: defaultPasswordHash,
    },
  })

  console.log('✅ Usuários criados!')

  // Criar produtos de exemplo
  const produtos = [
    { nome: 'Coca-Cola 2L', sku: 'COCA2L001', precoVenda: 8.50, estoqueAtual: 50 },
    { nome: 'Pão Francês', sku: 'PAOFR001', precoVenda: 0.60, estoqueAtual: 100 },
    { nome: 'Leite Integral 1L', sku: 'LEITE1L001', precoVenda: 4.80, estoqueAtual: 30 },
    { nome: 'Arroz 5kg', sku: 'ARROZ5K001', precoVenda: 15.90, estoqueAtual: 25 },
    { nome: 'Feijão 1kg', sku: 'FEIJAO1K001', precoVenda: 7.50, estoqueAtual: 40 },
    { nome: 'Açúcar Cristal 1kg', sku: 'ACUCAR1K001', precoVenda: 3.20, estoqueAtual: 35 },
    { nome: 'Óleo de Soja 900ml', sku: 'OLEO900ML001', precoVenda: 6.90, estoqueAtual: 20 },
    { nome: 'Macarrão Espaguete 500g', sku: 'MAC500G001', precoVenda: 3.50, estoqueAtual: 60 },
    { nome: 'Sabonete Líquido', sku: 'SABLIQ001', precoVenda: 4.25, estoqueAtual: 15 },
    { nome: 'Papel Higiênico 4 rolos', sku: 'PAPHIG4R001', precoVenda: 8.90, estoqueAtual: 45 },
    { nome: 'Detergente 500ml', sku: 'DET500ML001', precoVenda: 2.40, estoqueAtual: 30 },
    { nome: 'Café 500g', sku: 'CAFE500G001', precoVenda: 12.80, estoqueAtual: 18 }
  ]

  for (const produto of produtos) {
    await prisma.product.upsert({
      where: { sku: produto.sku },
      update: {},
      create: {
        nome: produto.nome,
        sku: produto.sku,
        precoVenda: produto.precoVenda,
        estoqueAtual: produto.estoqueAtual,
      },
    })
  }

  console.log('✅ Produtos criados!')
  console.log('🎉 Seed concluído com sucesso!')
  console.log('')
  console.log('👤 Usuários criados:')
  console.log('   Admin: admin@pdv.com / admin123')
  console.log('   Caixa: caixa@pdv.com / caixa123')
  console.log('')
  console.log(`📦 ${produtos.length} produtos adicionados ao estoque`)
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
