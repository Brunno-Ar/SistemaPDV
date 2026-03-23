const { TestRunner, assert, assertEqual, assertStatusCode, assertTruthy, assertContains } = require('../utils/test-runner');
const { createApiClient, createUnauthenticatedClient } = require('../utils/api-client');

(async () => {
  const runner = new TestRunner('🔌 API - Autenticação e Sessão');
  await runner.setup({ headless: true });

  let api;

  // ──── Setup ────
  await runner.test('Autenticação via API funciona e retorna cookies', async () => {
    api = await createApiClient('admin');
    assertTruthy(api.cookie, 'Deveria ter cookie de sessão');
  });

  // ──── API Session ────
  await runner.test('GET /api/auth/session retorna sessão válida', async () => {
    const res = await api.get('/api/auth/session');
    assertStatusCode(res, 200, 'Sessão deveria retornar 200');
    assertTruthy(res.data, 'Deveria retornar dados de sessão');

    if (res.data && res.data.user) {
      assertTruthy(res.data.user.email, 'Sessão deveria conter email do usuário');
    }
  });

  // ──── Sem auth ────
  await runner.test('GET /api/admin/products sem auth retorna 401 ou redirect', async () => {
    const unauth = createUnauthenticatedClient();
    const res = await unauth.get('/api/admin/products');
    assert(res.status === 401 || res.status === 403 || res.redirected, `Deveria bloquear acesso. Status: ${res.status}`);
  });

  // ──── CSRF token ────
  await runner.test('GET /api/auth/csrf retorna token CSRF', async () => {
    const unauth = createUnauthenticatedClient();
    const res = await unauth.get('/api/auth/csrf');
    assertStatusCode(res, 200, 'CSRF deveria retornar 200');
    assertTruthy(res.data, 'Deveria retornar dados');
  });

  await runner.teardown();
})();
