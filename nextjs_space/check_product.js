const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const id = "cmijh2qks000theo0jcd4swii";
  try {
    const product = await prisma.product.findUnique({ where: { id } });
    console.log("Product:", product);

    if (product) {
      const salesCount = await prisma.saleItem.count({
        where: { productId: id },
      });
      console.log("SaleItems count:", salesCount);

      const movementsCount = await prisma.movimentacaoEstoque.count({
        where: { produtoId: id },
      });
      console.log("Movements count:", movementsCount);

      const lotsCount = await prisma.lote.count({ where: { produtoId: id } });
      console.log("Lots count:", lotsCount);
    } else {
      console.log("Product not found");
    }
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
