const { TestRunner, assert, assertEqual, assertStatusCode, assertTruthy } = require('../utils/test-runner');
const { createApiClient, createUnauthenticatedClient } = require('../utils/api-client');

(async () => {
  const runner = new TestRunner('🔌 API - Vendas e Caixa');
  await runner.setup({ headless: true });

  let api;

  // ──── Setup ────
  await runner.test('Autenticação para testes de vendas', async () => {
    api = await createApiClient('admin');
    assertTruthy(api.cookie, 'Deveria ter cookie de sessão');
  });

  // ──── GET /api/admin/sales ────
  await runner.test('GET /api/admin/sales retorna vendas', async () => {
    const res = await api.get('/api/admin/sales');
    assertStatusCode(res, 200, 'Deveria retornar 200');
    assertTruthy(res.data, 'Deveria retornar dados');
  });

  // ──── GET /api/caixa ────
  await runner.test('GET /api/caixa retorna status do caixa', async () => {
    const res = await api.get('/api/caixa');
    assert(res.status === 200 || res.status === 404, `Deveria retornar status do caixa. Status: ${res.status}`);
  });

  // ──── GET /api/admin/caixas ────
  await runner.test('GET /api/admin/caixas retorna histórico de caixas', async () => {
    const res = await api.get('/api/admin/caixas');
    assertStatusCode(res, 200, 'Deveria retornar 200');
  });

  // ──── GET /api/admin/dashboard-stats ────
  await runner.test('GET /api/admin/dashboard-stats retorna estatísticas', async () => {
    const res = await api.get('/api/admin/dashboard-stats');
    assertStatusCode(res, 200, 'Deveria retornar 200');
    assertTruthy(res.data, 'Deveria retornar dados de estatísticas');
  });

  // ──── GET /api/admin/analytics ────
  await runner.test('GET /api/admin/analytics retorna dados analíticos', async () => {
    const res = await api.get('/api/admin/analytics');
    assertStatusCode(res, 200, 'Deveria retornar 200');
  });

  // ──── GET /api/employee/analytics ────
  await runner.test('GET /api/employee/analytics retorna analytics do funcionário', async () => {
    const res = await api.get('/api/employee/analytics');
    assertStatusCode(res, 200, 'Deveria retornar 200');
  });

  // ──── Vendas sem auth ────
  await runner.test('GET /api/sales sem auth retorna 401 ou redirect', async () => {
    const unauth = createUnauthenticatedClient();
    const res = await unauth.get('/api/sales');
    assert(res.status === 401 || res.status === 403 || res.redirected, `Deveria bloquear. Status: ${res.status}`);
  });

  // ──── GET /api/expenses ────
  await runner.test('GET /api/expenses retorna despesas', async () => {
    const res = await api.get('/api/expenses');
    assertStatusCode(res, 200, 'Deveria retornar 200');
  });

  // ──── GET /api/admin/movimentacoes ────
  await runner.test('GET /api/admin/movimentacoes retorna movimentações', async () => {
    const res = await api.get('/api/admin/movimentacoes');
    assertStatusCode(res, 200, 'Deveria retornar 200');
  });

  // ──── GET /api/admin/lotes ────
  await runner.test('GET /api/admin/lotes retorna lotes', async () => {
    const res = await api.get('/api/admin/lotes');
    assertStatusCode(res, 200, 'Deveria retornar 200');
  });

  await runner.teardown();
})();
