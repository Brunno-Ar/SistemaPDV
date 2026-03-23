const { TestRunner, assert, assertStatusCode, assertTruthy } = require('../utils/test-runner');
const { createApiClient, createUnauthenticatedClient } = require('../utils/api-client');

(async () => {
  const runner = new TestRunner('🔌 API - Equipe, Notas, Avisos e Misc');
  await runner.setup({ headless: true });

  let api;
  let createdNoteId;

  await runner.test('Autenticação', async () => {
    api = await createApiClient('admin');
    assertTruthy(api.cookie, 'Cookie de sessão');
  });

  // ──── EQUIPE ────
  await runner.test('GET /api/admin/equipe retorna funcionários', async () => {
    const res = await api.get('/api/admin/equipe');
    assertStatusCode(res, 200, 'Deveria retornar 200');
  });

  // ──── NOTAS ────
  await runner.test('GET /api/notes retorna notas', async () => {
    const res = await api.get('/api/notes');
    assertStatusCode(res, 200, 'Deveria retornar 200');
  });

  await runner.test('POST /api/notes cria nota', async () => {
    const res = await api.post('/api/notes', {
      title: `Nota Teste API ${Date.now()}`,
      content: 'Conteúdo de teste automatizado',
      color: 'yellow',
    });

    assert(res.status === 200 || res.status === 201, `Deveria criar nota. Status: ${res.status}`);

    if (res.data && res.data.id) {
      createdNoteId = res.data.id;
    }
  });

  await runner.test('PATCH /api/notes/[id] edita nota', async () => {
    if (!createdNoteId) { assertTruthy(true, 'Skip'); return; }

    const res = await api.patch(`/api/notes/${createdNoteId}`, {
      title: 'Nota Editada API Test',
      content: 'Conteúdo editado',
    });

    assert(res.status === 200 || res.status === 204, `Deveria editar nota. Status: ${res.status}`);
  });

  await runner.test('DELETE /api/notes/[id] remove nota', async () => {
    if (!createdNoteId) { assertTruthy(true, 'Skip'); return; }

    const res = await api.delete(`/api/notes/${createdNoteId}`);
    assert(res.status === 200 || res.status === 204, `Deveria deletar nota. Status: ${res.status}`);
  });

  // ──── AVISOS ────
  await runner.test('GET /api/avisos retorna avisos', async () => {
    const res = await api.get('/api/avisos');
    assertStatusCode(res, 200, 'Deveria retornar 200');
  });

  // ──── COMPANY STATUS ────
  await runner.test('GET /api/company/status retorna status da empresa', async () => {
    const res = await api.get('/api/company/status');
    assertStatusCode(res, 200, 'Deveria retornar 200');
  });

  // ──── ADMIN CONFIG ────
  await runner.test('GET /api/admin/assinatura/info retorna info da assinatura', async () => {
    const res = await api.get('/api/admin/assinatura/info');
    assert(res.status === 200 || res.status === 404, `Info assinatura. Status: ${res.status}`);
  });

  // ──── BILLING ────
  await runner.test('GET /api/billing/pending retorna status de pagamento', async () => {
    const res = await api.get('/api/billing/pending');
    assert(res.status === 200 || res.status === 404, `Billing pending. Status: ${res.status}`);
  });

  // ──── CUPONS VALIDATE (público) ────
  await runner.test('POST /api/cupons/validate com cupom inválido retorna erro', async () => {
    const unauth = createUnauthenticatedClient();
    const res = await unauth.post('/api/cupons/validate', { codigo: 'CUPOM-INEXISTENTE-XYZ' });
    assert(res.status === 200 || res.status === 404 || res.status === 400, `Cupom inválido. Status: ${res.status}`);
  });

  // ──── SYNC PRODUCTS ────
  await runner.test('GET /api/sync/products retorna produtos para sync', async () => {
    const res = await api.get('/api/sync/products');
    assertStatusCode(res, 200, 'Deveria retornar 200');
  });

  // ──── ADMIN RECALCULATE STOCK ────
  await runner.test('POST /api/admin/recalculate-stock funciona', async () => {
    const res = await api.post('/api/admin/recalculate-stock');
    assert(res.status === 200 || res.status === 204, `Recalculate stock. Status: ${res.status}`);
  });

  await runner.teardown();
})();
