const { chromium } = require('playwright');
const { TestRunner, assert, assertEqual, assertContains, assertTruthy } = require(require('path').resolve(__dirname, '../../utils/') + '/test-runner');
const { BASE_URL, CREDENTIALS } = require(require('path').resolve(__dirname, '../../utils/') + '/auth-helper');

const SKILL_DIR = 'd:/IMPORTANTE/Google Antigravity/Site 4/pdv_system/.agent/skills/skills/playwright-skill';

(async () => {
  const runner = new TestRunner('🔐 Autenticação - Login');
  const browser = await runner.setup({ headless: false, slowMo: 80 });

  // ──── 1.1 Login com credenciais válidas ────
  await runner.test('Login com credenciais válidas redireciona para área logada', async () => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle', timeout: 15000 });

    const emailInput = page.locator('input[name="email"], input[type="email"], #email').first();
    const passwordInput = page.locator('input[name="password"], input[type="password"], #password').first();

    await emailInput.fill(CREDENTIALS.admin.email);
    await passwordInput.fill(CREDENTIALS.admin.password);

    await page.locator('button[type="submit"]').click();

    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 });

    const currentUrl = page.url();
    assert(!currentUrl.includes('/login'), `Deveria ter saído do /login, mas está em: ${currentUrl}`);

    await page.screenshot({ path: '/tmp/test-login-success.png', fullPage: true });
    await context.close();
  });

  // ──── 1.2 Login com credenciais inválidas ────
  await runner.test('Login com credenciais inválidas mostra erro', async () => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle', timeout: 15000 });

    const emailInput = page.locator('input[name="email"], input[type="email"], #email').first();
    const passwordInput = page.locator('input[name="password"], input[type="password"], #password').first();

    await emailInput.fill('invalido@fake.com');
    await passwordInput.fill('senhaerrada123');

    await page.locator('button[type="submit"]').click();

    await page.waitForTimeout(3000);

    const currentUrl = page.url();
    const hasError = currentUrl.includes('/login') || currentUrl.includes('error');
    assert(hasError, `Deveria permanecer no login ou mostrar erro, mas está em: ${currentUrl}`);

    await page.screenshot({ path: '/tmp/test-login-invalid.png', fullPage: true });
    await context.close();
  });

  // ──── 1.3 Login com campos vazios ────
  await runner.test('Login com campos vazios não submete o form', async () => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle', timeout: 15000 });

    const submitBtn = page.locator('button[type="submit"]');
    await submitBtn.click();

    await page.waitForTimeout(2000);

    const currentUrl = page.url();
    assertContains(currentUrl, '/login', 'Deveria permanecer na página de login');

    await context.close();
  });

  // ──── 1.4 Login com email válido mas senha errada ────
  await runner.test('Login com email válido mas senha errada mostra erro', async () => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle', timeout: 15000 });

    const emailInput = page.locator('input[name="email"], input[type="email"], #email').first();
    const passwordInput = page.locator('input[name="password"], input[type="password"], #password').first();

    await emailInput.fill(CREDENTIALS.admin.email);
    await passwordInput.fill('senhacompletamenteerrada');

    await page.locator('button[type="submit"]').click();

    await page.waitForTimeout(3000);

    const currentUrl = page.url();
    assertContains(currentUrl, '/login', 'Deveria permanecer na página de login');

    await context.close();
  });

  // ──── 1.5 Página de login renderiza corretamente ────
  await runner.test('Página de login possui campos de email, senha e botão de submit', async () => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle', timeout: 15000 });

    const emailInput = page.locator('input[name="email"], input[type="email"], #email').first();
    const passwordInput = page.locator('input[name="password"], input[type="password"], #password').first();
    const submitBtn = page.locator('button[type="submit"]');

    assertTruthy(await emailInput.isVisible(), 'Campo de email deveria estar visível');
    assertTruthy(await passwordInput.isVisible(), 'Campo de senha deveria estar visível');
    assertTruthy(await submitBtn.isVisible(), 'Botão de submit deveria estar visível');

    await context.close();
  });

  // ──── 1.6 Link para "Esqueci minha senha" existe ────
  await runner.test('Link "Esqueci minha senha" está visível na página de login', async () => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle', timeout: 15000 });

    const forgotLink = page.locator('a[href*="forgot"], a[href*="esquec"]').first();
    const isVisible = await forgotLink.isVisible().catch(() => false);

    const pageContent = await page.textContent('body');
    const hasForgotText = pageContent.toLowerCase().includes('esquec') || pageContent.toLowerCase().includes('forgot');

    assert(isVisible || hasForgotText, 'Deveria ter um link ou texto de "Esqueci minha senha"');

    await context.close();
  });

  // ──── 1.7 Link para cadastro existe ────
  await runner.test('Link para cadastro está visível na página de login', async () => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle', timeout: 15000 });

    const signupLink = page.locator('a[href*="signup"], a[href*="cadastr"], a[href*="registro"]').first();
    const isVisible = await signupLink.isVisible().catch(() => false);

    const pageContent = await page.textContent('body');
    const hasSignupText = pageContent.toLowerCase().includes('cadastr') || pageContent.toLowerCase().includes('criar conta');

    assert(isVisible || hasSignupText, 'Deveria ter um link ou texto de cadastro');

    await context.close();
  });

  // ──── 1.8 Acesso a rota protegida sem login redireciona ────
  await runner.test('Acesso a /admin sem login redireciona para /login', async () => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(`${BASE_URL}/admin`, { waitUntil: 'networkidle', timeout: 15000 });

    const currentUrl = page.url();
    assertContains(currentUrl, '/login', 'Deveria redirecionar para /login');

    await context.close();
  });

  // ──── 1.9 Acesso a /vender sem login redireciona ────
  await runner.test('Acesso a /vender sem login redireciona para /login', async () => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(`${BASE_URL}/vender`, { waitUntil: 'networkidle', timeout: 15000 });

    const currentUrl = page.url();
    assertContains(currentUrl, '/login', 'Deveria redirecionar para /login');

    await context.close();
  });

  // ──── 1.10 Acesso a /master sem login redireciona ────
  await runner.test('Acesso a /master sem login redireciona para /login', async () => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(`${BASE_URL}/master`, { waitUntil: 'networkidle', timeout: 15000 });

    const currentUrl = page.url();
    assertContains(currentUrl, '/login', 'Deveria redirecionar para /login');

    await context.close();
  });

  await runner.teardown();
})();
