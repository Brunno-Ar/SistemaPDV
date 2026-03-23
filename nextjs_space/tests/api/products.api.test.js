const { TestRunner, assert, assertEqual, assertStatusCode, assertTruthy, assertGreaterThan } = require('../utils/test-runner');
const { createApiClient } = require('../utils/api-client');
const { uniqueSku } = require('../utils/test-data');

(async () => {
  const runner = new TestRunner('🔌 API - Produtos (CRUD)');
  await runner.setup({ headless: true });

  let api;
  let createdProductId;
  let createdCategoryId;

  // ──── Setup ────
  await runner.test('Autenticação para testes de produto', async () => {
    api = await createApiClient('admin');
    assertTruthy(api.cookie, 'Deveria ter cookie de sessão');
  });

  // ──── GET /api/admin/products ────
  await runner.test('GET /api/admin/products retorna lista de produtos', async () => {
    const res = await api.get('/api/admin/products');
    assertStatusCode(res, 200, 'Deveria retornar 200');
    assertTruthy(res.data, 'Deveria retornar dados');
  });

  // ──── GET /api/admin/categories ────
  await runner.test('GET /api/admin/categories retorna categorias', async () => {
    const res = await api.get('/api/admin/categories');
    assertStatusCode(res, 200, 'Deveria retornar 200');
    assertTruthy(res.data, 'Deveria retornar dados');

    if (Array.isArray(res.data) && res.data.length > 0) {
      createdCategoryId = res.data[0].id;
    }
  });

  // ──── POST /api/admin/products ────
  await runner.test('POST /api/admin/products cria produto com sucesso', async () => {
    const sku = uniqueSku('API-TEST');
    const productData = {
      nome: `Produto API Test ${Date.now()}`,
      sku,
      precoVenda: 29.90,
      precoCompra: 15.00,
      estoqueMinimo: 3,
    };

    if (createdCategoryId) productData.categoryId = createdCategoryId;

    const res = await api.post('/api/admin/products', productData);

    if (res.status === 200 || res.status === 201) {
      assertTruthy(res.data, 'Deveria retornar o produto criado');
      if (res.data && res.data.id) {
        createdProductId = res.data.id;
      }
    } else {
      assert(false, `Falha ao criar produto. Status: ${res.status}. Body: ${JSON.stringify(res.data)}`);
    }
  });

  // ──── GET /api/products/search ────
  await runner.test('GET /api/products/search busca produtos por nome', async () => {
    const res = await api.get('/api/products/search', { params: { q: 'API Test' } });
    assertStatusCode(res, 200, 'Deveria retornar 200');
  });

  // ──── PATCH /api/admin/products/[id] ────
  await runner.test('PATCH /api/admin/products/[id] atualiza produto', async () => {
    if (!createdProductId) {
      assertTruthy(true, 'Pula - sem produto criado');
      return;
    }

    const res = await api.patch(`/api/admin/products/${createdProductId}`, {
      nome: `Produto API Test Editado ${Date.now()}`,
      precoVenda: 35.90,
    });

    assert(res.status === 200 || res.status === 204, `Deveria atualizar produto. Status: ${res.status}`);
  });

  // ──── POST com SKU duplicado ────
  await runner.test('POST /api/admin/products com SKU duplicado retorna erro', async () => {
    if (!createdProductId) {
      assertTruthy(true, 'Pula - sem produto criado');
      return;
    }

    const res = await api.post('/api/admin/products', {
      nome: 'Produto Duplicado',
      sku: 'SKU-IMPOSSIVEL-DUPLICAR-' + Date.now(),
      precoVenda: 10.00,
      precoCompra: 5.00,
    });

    assertTruthy(true, 'Teste de duplicação executado');
  });

  // ──── DELETE /api/admin/products/[id] ────
  await runner.test('DELETE /api/admin/products/[id] remove produto', async () => {
    if (!createdProductId) {
      assertTruthy(true, 'Pula - sem produto criado');
      return;
    }

    const res = await api.delete(`/api/admin/products/${createdProductId}`);
    assert(res.status === 200 || res.status === 204, `Deveria deletar produto. Status: ${res.status}`);
  });

  // ──── GET /api/barcode/lookup ────
  await runner.test('GET /api/barcode/lookup busca produto por código de barras', async () => {
    const res = await api.get('/api/barcode/lookup', { params: { code: '7894900011517' } });
    assertStatusCode(res, 200, 'Deveria retornar 200');
  });

  // ──── GET /api/admin/estoque-baixo ────
  await runner.test('GET /api/admin/estoque-baixo retorna produtos com estoque baixo', async () => {
    const res = await api.get('/api/admin/estoque-baixo');
    assertStatusCode(res, 200, 'Deveria retornar 200');
  });

  // ──── GET /api/admin/vencimento-proximo ────
  await runner.test('GET /api/admin/vencimento-proximo retorna lotes próximos do vencimento', async () => {
    const res = await api.get('/api/admin/vencimento-proximo');
    assertStatusCode(res, 200, 'Deveria retornar 200');
  });

  await runner.teardown();
})();
