const TEST_PRODUCT = {
  nome: 'Produto Teste E2E',
  sku: 'TEST-E2E-001',
  precoVenda: 25.50,
  precoCompra: 12.00,
  estoqueMinimo: 5,
};

const TEST_PRODUCT_2 = {
  nome: 'Produto Teste E2E 2',
  sku: 'TEST-E2E-002',
  precoVenda: 49.90,
  precoCompra: 20.00,
  estoqueMinimo: 3,
};

const TEST_CATEGORY = {
  nome: 'Categoria Teste E2E',
};

const TEST_EMPLOYEE = {
  name: 'Funcionário Teste E2E',
  email: `teste-e2e-${Date.now()}@pdv.com`,
  password: 'teste123',
  role: 'caixa',
};

const TEST_LOTE = {
  numeroLote: 'LOTE-E2E-001',
  quantidade: 50,
  precoCompra: 12.00,
};

const TEST_CAIXA = {
  saldoInicial: 100.00,
};

const TEST_SALE = {
  metodoPagamento: 'dinheiro',
  valorRecebido: 30.00,
};

const TEST_NOTE = {
  title: 'Nota Teste E2E',
  content: 'Conteúdo da nota de teste automatizado',
  color: 'yellow',
};

const TEST_EXPENSE = {
  description: 'Despesa teste E2E',
  amount: 150.00,
  category: 'OPERACIONAL',
};

const TEST_CUPOM = {
  codigo: `TESTE-E2E-${Date.now()}`,
  descontoPorcentagem: 10,
  limiteUsos: 5,
};

function uniqueEmail(prefix = 'teste') {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}@pdv.com`;
}

function uniqueSku(prefix = 'TEST') {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

module.exports = {
  TEST_PRODUCT,
  TEST_PRODUCT_2,
  TEST_CATEGORY,
  TEST_EMPLOYEE,
  TEST_LOTE,
  TEST_CAIXA,
  TEST_SALE,
  TEST_NOTE,
  TEST_EXPENSE,
  TEST_CUPOM,
  uniqueEmail,
  uniqueSku,
};
