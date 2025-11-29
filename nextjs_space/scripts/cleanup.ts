import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🧹 Iniciando limpeza de duplicatas...");

  // 1. Limpar Lotes Duplicados
  // A estratégia é: Agrupar por (numeroLote, produtoId) e manter apenas o mais recente (ou antigo).

  const allLotes = await prisma.lote.findMany({
    orderBy: { createdAt: "asc" },
  });

  const seenLotes = new Set();
  let deletedCount = 0;

  for (const lote of allLotes) {
    // Chave única lógica: produto + número do lote
    const key = `${lote.produtoId}-${lote.numeroLote}`;

    if (seenLotes.has(key)) {
      // Já vimos um lote com este número para este produto. Este é uma duplicata.
      console.log(
        `🗑️ Deletando lote duplicado: ${lote.numeroLote} (ID: ${lote.id})`
      );
      await prisma.lote.delete({
        where: { id: lote.id },
      });
      deletedCount++;
    } else {
      // Primeiro vez que vemos. Mantemos este.
      seenLotes.add(key);
    }
  }

  console.log(
    `✅ Limpeza concluída! ${deletedCount} lotes duplicados removidos.`
  );
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
