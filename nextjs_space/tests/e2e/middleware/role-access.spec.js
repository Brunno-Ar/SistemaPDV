const { chromium } = require('playwright');
const { TestRunner, assert, assertContains, assertTruthy } = require(require('path').resolve(__dirname, '../../utils/') + '/test-runner');
const { BASE_URL, createAuthenticatedPage } = require(require('path').resolve(__dirname, '../../utils/') + '/auth-helper');

(async () => {
  const runner = new TestRunner('🔒 Middleware - Permissões de Acesso por Role');
  const browser = await runner.setup({ headless: false, slowMo: 50 });

  // ──── 7.1 Admin acessa /admin ────
  await runner.test('Admin consegue acessar /admin (dashboard)', async () => {
    const { page, context } = await createAuthenticatedPage(browser);
    await page.goto(`${BASE_URL}/admin`, { waitUntil: 'networkidle', timeout: 20000 });

    const currentUrl = page.url();
    assert(!currentUrl.includes('/login'), `Admin deveria acessar /admin, mas está em: ${currentUrl}`);

    await page.screenshot({ path: '/tmp/test-middleware-admin-dashboard.png', fullPage: true });
    await context.close();
  });

  // ──── 7.2 Admin acessa /estoque ────
  await runner.test('Admin consegue acessar /estoque', async () => {
    const { page, context } = await createAuthenticatedPage(browser);
    await page.goto(`${BASE_URL}/estoque`, { waitUntil: 'networkidle', timeout: 20000 });

    const currentUrl = page.url();
    assert(!currentUrl.includes('/login'), `Admin deveria acessar /estoque`);

    await context.close();
  });

  // ──── 7.3 Admin acessa /equipe ────
  await runner.test('Admin consegue acessar /equipe', async () => {
    const { page, context } = await createAuthenticatedPage(browser);
    await page.goto(`${BASE_URL}/equipe`, { waitUntil: 'networkidle', timeout: 20000 });

    const currentUrl = page.url();
    assert(!currentUrl.includes('/login'), `Admin deveria acessar /equipe`);

    await context.close();
  });

  // ──── 7.4 Admin acessa /relatorios ────
  await runner.test('Admin consegue acessar /relatorios', async () => {
    const { page, context } = await createAuthenticatedPage(browser);
    await page.goto(`${BASE_URL}/relatorios`, { waitUntil: 'networkidle', timeout: 20000 });

    const currentUrl = page.url();
    assert(!currentUrl.includes('/login'), `Admin deveria acessar /relatorios`);

    await context.close();
  });

  // ──── 7.5 Admin acessa /lotes ────
  await runner.test('Admin consegue acessar /lotes', async () => {
    const { page, context } = await createAuthenticatedPage(browser);
    await page.goto(`${BASE_URL}/lotes`, { waitUntil: 'networkidle', timeout: 20000 });

    const currentUrl = page.url();
    assert(!currentUrl.includes('/login'), `Admin deveria acessar /lotes`);

    await context.close();
  });

  // ──── 7.6 Admin acessa /movimentacoes ────
  await runner.test('Admin consegue acessar /movimentacoes', async () => {
    const { page, context } = await createAuthenticatedPage(browser);
    await page.goto(`${BASE_URL}/movimentacoes`, { waitUntil: 'networkidle', timeout: 20000 });

    const currentUrl = page.url();
    assert(!currentUrl.includes('/login'), `Admin deveria acessar /movimentacoes`);

    await context.close();
  });

  // ──── 7.7 Admin NÃO acessa /master ────
  await runner.test('Admin NÃO consegue acessar /master (redireciona)', async () => {
    const { page, context } = await createAuthenticatedPage(browser);
    await page.goto(`${BASE_URL}/master`, { waitUntil: 'networkidle', timeout: 20000 });

    const currentUrl = page.url();
    assert(!currentUrl.includes('/master') || currentUrl.includes('/vender'), `Admin não deveria acessar /master, está em: ${currentUrl}`);

    await page.screenshot({ path: '/tmp/test-middleware-admin-no-master.png', fullPage: true });
    await context.close();
  });

  // ──── 7.8 Sem auth, /admin redireciona ────
  await runner.test('Sem autenticação, /admin redireciona para /login', async () => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(`${BASE_URL}/admin`, { waitUntil: 'networkidle', timeout: 15000 });

    const currentUrl = page.url();
    assertContains(currentUrl, '/login', 'Deveria redirecionar para /login');

    await context.close();
  });

  // ──── 7.9 Sem auth, /equipe redireciona ────
  await runner.test('Sem autenticação, /equipe redireciona para /login', async () => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(`${BASE_URL}/equipe`, { waitUntil: 'networkidle', timeout: 15000 });

    const currentUrl = page.url();
    assertContains(currentUrl, '/login', 'Deveria redirecionar para /login');

    await context.close();
  });

  // ──── 7.10 Sem auth, /relatorios redireciona ────
  await runner.test('Sem autenticação, /relatorios redireciona para /login', async () => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(`${BASE_URL}/relatorios`, { waitUntil: 'networkidle', timeout: 15000 });

    const currentUrl = page.url();
    assertContains(currentUrl, '/login', 'Deveria redirecionar para /login');

    await context.close();
  });

  // ──── 7.11 Página / (landing) é pública ────
  await runner.test('Página / (landing) é acessível sem autenticação', async () => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle', timeout: 15000 });

    const currentUrl = page.url();
    assert(!currentUrl.includes('/login') || currentUrl === `${BASE_URL}/`, 'Landing page deveria ser pública');

    await context.close();
  });

  // ──── 7.12 /login é acessível sem auth ────
  await runner.test('Página /login é acessível sem autenticação', async () => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle', timeout: 15000 });

    const currentUrl = page.url();
    assertContains(currentUrl, '/login', 'Página de login deveria ser acessível');

    await context.close();
  });

  // ──── 7.13 /signup é acessível sem auth ────
  await runner.test('Página /signup é acessível sem autenticação', async () => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(`${BASE_URL}/signup`, { waitUntil: 'networkidle', timeout: 15000 });

    const currentUrl = page.url();
    assert(!currentUrl.includes('/login') || currentUrl.includes('/signup'), 'Página de signup deveria ser acessível');

    await context.close();
  });

  await runner.teardown();
})();
