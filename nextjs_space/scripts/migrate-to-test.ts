/**
 * Script para migrar dados do banco de PRODUÇÃO para o banco de TESTE
 * EXCLUI: Empresa "Adega Freestyle Drinks" e todos os dados relacionados
 */

import { PrismaClient } from "@prisma/client";
import * as dotenv from "dotenv";

// Carregar variáveis de ambiente
dotenv.config();

// URLs dos bancos
const PRODUCTION_URL =
  "postgresql://postgres.osrrkvchfzlbkpfgxpgr:BrunnoAr.10z!@aws-1-us-east-2.pooler.supabase.com:5432/postgres";
const TEST_URL =
  "postgresql://postgres.siktjkekhcrgpxpgbmlh:BrunnoAr.10z!@aws-1-us-east-2.pooler.supabase.com:5432/postgres";

// Empresas a EXCLUIR (case insensitive)
const EMPRESAS_EXCLUIDAS = [
  "adega freestyle drinks",
  "freestyle drinks",
  "adega freestyle",
];

// Criar clientes Prisma para cada banco
const prodDb = new PrismaClient({
  datasources: { db: { url: PRODUCTION_URL } },
});

const testDb = new PrismaClient({
  datasources: { db: { url: TEST_URL } },
});

async function main() {
  console.log("🚀 Iniciando migração de dados...\n");
  console.log("📋 Origem: Banco de PRODUÇÃO");
  console.log("📋 Destino: Banco de TESTE");
  console.log(
    '🚫 Excluindo: Empresa "Adega Freestyle Drinks" e dados relacionados\n'
  );

  try {
    // ========================================
    // 1. BUSCAR DADOS DO BANCO DE PRODUÇÃO
    // ========================================
    console.log("📥 Buscando dados do banco de produção...\n");

    // Buscar todas as empresas
    const todasEmpresas = await prodDb.empresa.findMany({
      include: {
        users: true,
        products: {
          include: {
            lotes: true,
          },
        },
        sales: {
          include: {
            saleItems: true,
          },
        },
        movimentacoes: true,
        avisos: true,
        categories: true,
        Caixa: {
          include: {
            movimentacoes: true,
          },
        },
      },
    });

    // Filtrar empresas excluídas
    const empresas = todasEmpresas.filter(
      (e) =>
        !EMPRESAS_EXCLUIDAS.some((excluida) =>
          e.nome.toLowerCase().includes(excluida.toLowerCase())
        )
    );

    const empresasExcluidas = todasEmpresas.filter((e) =>
      EMPRESAS_EXCLUIDAS.some((excluida) =>
        e.nome.toLowerCase().includes(excluida.toLowerCase())
      )
    );

    console.log(`✅ Empresas encontradas: ${todasEmpresas.length}`);
    console.log(
      `🚫 Empresas excluídas: ${empresasExcluidas.map((e) => e.nome).join(", ") || "Nenhuma"}`
    );
    console.log(`📦 Empresas a migrar: ${empresas.length}\n`);

    // IDs das empresas excluídas (para filtrar usuários master sem empresa)
    const idsEmpresasExcluidas = empresasExcluidas.map((e) => e.id);

    // Buscar usuários master (sem empresa)
    const usuariosMaster = await prodDb.user.findMany({
      where: {
        role: "master",
        empresaId: null,
      },
      include: {
        accounts: true,
        sessions: true,
      },
    });

    console.log(`👤 Usuários Master encontrados: ${usuariosMaster.length}`);

    // ========================================
    // 2. LIMPAR BANCO DE TESTE
    // ========================================
    console.log("\n🧹 Limpando banco de teste...");

    // Deletar na ordem correta (respeitando foreign keys)
    await testDb.movimentacaoCaixa.deleteMany({});
    await testDb.caixa.deleteMany({});
    await testDb.saleItem.deleteMany({});
    await testDb.sale.deleteMany({});
    await testDb.movimentacaoEstoque.deleteMany({});
    await testDb.lote.deleteMany({});
    await testDb.product.deleteMany({});
    await testDb.aviso.deleteMany({});
    await testDb.category.deleteMany({});
    await testDb.session.deleteMany({});
    await testDb.account.deleteMany({});
    await testDb.user.deleteMany({});
    await testDb.empresa.deleteMany({});

    console.log("✅ Banco de teste limpo!\n");

    // ========================================
    // 3. INSERIR DADOS NO BANCO DE TESTE
    // ========================================
    console.log("📤 Inserindo dados no banco de teste...\n");

    // 3.1 Inserir Usuários Master
    for (const master of usuariosMaster) {
      console.log(`  👤 Inserindo master: ${master.email}`);
      await testDb.user.create({
        data: {
          id: master.id,
          name: master.name,
          email: master.email,
          emailVerified: master.emailVerified,
          image: master.image,
          password: master.password,
          nome: master.nome,
          role: master.role,
          empresaId: null,
          createdAt: master.createdAt,
          metaMensal: master.metaMensal,
          mustChangePassword: master.mustChangePassword,
          tourCompleted: master.tourCompleted,
        },
      });
    }

    // 3.2 Inserir Empresas e dados relacionados
    for (const empresa of empresas) {
      console.log(`\n📦 Migrando empresa: ${empresa.nome}`);

      // Criar empresa
      await testDb.empresa.create({
        data: {
          id: empresa.id,
          nome: empresa.nome,
          status: empresa.status,
          vencimentoPlano: empresa.vencimentoPlano,
          diaVencimento: empresa.diaVencimento,
          telefone: empresa.telefone,
          createdAt: empresa.createdAt,
          dataCriacao: empresa.dataCriacao,
        },
      });

      // Criar categorias
      for (const category of empresa.categories) {
        await testDb.category.create({
          data: {
            id: category.id,
            nome: category.nome,
            empresaId: category.empresaId,
            createdAt: category.createdAt,
          },
        });
      }
      console.log(`  📁 Categorias: ${empresa.categories.length}`);

      // Criar usuários da empresa
      for (const user of empresa.users) {
        await testDb.user.create({
          data: {
            id: user.id,
            name: user.name,
            email: user.email,
            emailVerified: user.emailVerified,
            image: user.image,
            password: user.password,
            nome: user.nome,
            role: user.role,
            empresaId: user.empresaId,
            createdAt: user.createdAt,
            metaMensal: user.metaMensal,
            mustChangePassword: user.mustChangePassword,
            tourCompleted: user.tourCompleted,
          },
        });
      }
      console.log(`  👥 Usuários: ${empresa.users.length}`);

      // Criar produtos e lotes
      for (const product of empresa.products) {
        await testDb.product.create({
          data: {
            id: product.id,
            nome: product.nome,
            sku: product.sku,
            precoVenda: product.precoVenda,
            precoCompra: product.precoCompra,
            estoqueAtual: product.estoqueAtual,
            estoqueMinimo: product.estoqueMinimo,
            imagemUrl: product.imagemUrl,
            empresaId: product.empresaId,
            categoryId: product.categoryId,
            createdAt: product.createdAt,
            updatedAt: product.updatedAt,
          },
        });

        // Criar lotes do produto
        for (const lote of product.lotes) {
          await testDb.lote.create({
            data: {
              id: lote.id,
              numeroLote: lote.numeroLote,
              dataValidade: lote.dataValidade,
              precoCompra: lote.precoCompra,
              quantidade: lote.quantidade,
              produtoId: lote.produtoId,
              createdAt: lote.createdAt,
              dataCompra: lote.dataCompra,
            },
          });
        }
      }
      console.log(`  📦 Produtos: ${empresa.products.length}`);
      console.log(
        `  📋 Lotes: ${empresa.products.reduce((acc, p) => acc + p.lotes.length, 0)}`
      );

      // Criar vendas e itens
      for (const sale of empresa.sales) {
        await testDb.sale.create({
          data: {
            id: sale.id,
            userId: sale.userId,
            empresaId: sale.empresaId,
            dataHora: sale.dataHora,
            valorTotal: sale.valorTotal,
            valorRecebido: sale.valorRecebido,
            troco: sale.troco,
            metodoPagamento: sale.metodoPagamento,
            createdAt: sale.createdAt,
          },
        });

        // Criar itens da venda
        for (const item of sale.saleItems) {
          await testDb.saleItem.create({
            data: {
              id: item.id,
              saleId: item.saleId,
              productId: item.productId,
              quantidade: item.quantidade,
              precoUnitario: item.precoUnitario,
              custoUnitario: item.custoUnitario,
              descontoAplicado: item.descontoAplicado,
              subtotal: item.subtotal,
            },
          });
        }
      }
      console.log(`  💰 Vendas: ${empresa.sales.length}`);

      // Criar movimentações de estoque
      for (const mov of empresa.movimentacoes) {
        await testDb.movimentacaoEstoque.create({
          data: {
            id: mov.id,
            produtoId: mov.produtoId,
            usuarioId: mov.usuarioId,
            empresaId: mov.empresaId,
            tipo: mov.tipo,
            quantidade: mov.quantidade,
            motivo: mov.motivo,
            loteId: mov.loteId,
            dataMovimentacao: mov.dataMovimentacao,
          },
        });
      }
      console.log(
        `  📊 Movimentações estoque: ${empresa.movimentacoes.length}`
      );

      // Criar caixas e movimentações de caixa
      for (const caixa of empresa.Caixa) {
        await testDb.caixa.create({
          data: {
            id: caixa.id,
            usuarioId: caixa.usuarioId,
            empresaId: caixa.empresaId,
            saldoInicial: caixa.saldoInicial,
            saldoFinal: caixa.saldoFinal,
            valorInformadoDinheiro: caixa.valorInformadoDinheiro,
            valorInformadoPix: caixa.valorInformadoPix,
            valorInformadoCartao: caixa.valorInformadoCartao,
            valorInformadoMaquininha: caixa.valorInformadoMaquininha,
            justificativa: caixa.justificativa,
            quebraDeCaixa: caixa.quebraDeCaixa,
            divergenciaDinheiro: caixa.divergenciaDinheiro,
            status: caixa.status,
            dataAbertura: caixa.dataAbertura,
            dataFechamento: caixa.dataFechamento,
          },
        });

        // Criar movimentações do caixa
        for (const movCaixa of caixa.movimentacoes) {
          await testDb.movimentacaoCaixa.create({
            data: {
              id: movCaixa.id,
              caixaId: movCaixa.caixaId,
              usuarioId: movCaixa.usuarioId,
              tipo: movCaixa.tipo,
              valor: movCaixa.valor,
              metodoPagamento: movCaixa.metodoPagamento,
              descricao: movCaixa.descricao,
              dataHora: movCaixa.dataHora,
            },
          });
        }
      }
      console.log(`  💵 Caixas: ${empresa.Caixa.length}`);

      // Criar avisos (verificando se remetente/destinatário existem)
      let avisosInseridos = 0;
      for (const aviso of empresa.avisos) {
        try {
          // Verificar se o remetente existe no banco de teste
          const remetenteExiste = await testDb.user.findUnique({
            where: { id: aviso.remetenteId },
          });

          if (!remetenteExiste) {
            continue; // Pular aviso se remetente não existe
          }

          // Verificar se destinatário existe (se houver)
          if (aviso.destinatarioId) {
            const destinatarioExiste = await testDb.user.findUnique({
              where: { id: aviso.destinatarioId },
            });
            if (!destinatarioExiste) {
              continue; // Pular aviso se destinatário não existe
            }
          }

          await testDb.aviso.create({
            data: {
              id: aviso.id,
              mensagem: aviso.mensagem,
              importante: aviso.importante,
              lido: aviso.lido,
              empresaId: aviso.empresaId,
              remetenteId: aviso.remetenteId,
              destinatarioId: aviso.destinatarioId,
              criadoEm: aviso.criadoEm,
            },
          });
          avisosInseridos++;
        } catch (e) {
          // Ignorar erros de foreign key em avisos
        }
      }
      console.log(`  📢 Avisos: ${avisosInseridos}/${empresa.avisos.length}`);
    }

    // ========================================
    // 4. RESUMO FINAL
    // ========================================
    console.log("\n========================================");
    console.log("✅ MIGRAÇÃO CONCLUÍDA COM SUCESSO!");
    console.log("========================================\n");

    // Contar registros no banco de teste
    const stats = {
      empresas: await testDb.empresa.count(),
      usuarios: await testDb.user.count(),
      produtos: await testDb.product.count(),
      lotes: await testDb.lote.count(),
      vendas: await testDb.sale.count(),
      categorias: await testDb.category.count(),
      caixas: await testDb.caixa.count(),
    };

    console.log("📊 Dados no banco de TESTE:");
    console.log(`   Empresas: ${stats.empresas}`);
    console.log(`   Usuários: ${stats.usuarios}`);
    console.log(`   Produtos: ${stats.produtos}`);
    console.log(`   Lotes: ${stats.lotes}`);
    console.log(`   Vendas: ${stats.vendas}`);
    console.log(`   Categorias: ${stats.categorias}`);
    console.log(`   Caixas: ${stats.caixas}`);
    console.log("");
  } catch (error) {
    console.error("\n❌ ERRO na migração:", error);
    throw error;
  } finally {
    await prodDb.$disconnect();
    await testDb.$disconnect();
  }
}

main();
