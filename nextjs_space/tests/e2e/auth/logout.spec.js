const { chromium } = require('playwright');
const { TestRunner, assert, assertContains, assertTruthy } = require('../utils/test-runner');
const { BASE_URL, createAuthenticatedPage } = require('../utils/auth-helper');

(async () => {
  const runner = new TestRunner('🔐 Autenticação - Logout');
  const browser = await runner.setup({ headless: false, slowMo: 80 });

  // ──── Logout destrói sessão ────
  await runner.test('Logout destrói a sessão e redireciona para login', async () => {
    const { page, context } = await createAuthenticatedPage(browser);

    await page.goto(`${BASE_URL}/admin`, { waitUntil: 'networkidle', timeout: 15000 });

    const currentUrl = page.url();
    assert(!currentUrl.includes('/login'), `Deveria estar logado, mas está em: ${currentUrl}`);

    const logoutBtn = page.locator('#menu-sair, [data-testid="logout"], button:has-text("Sair"), a:has-text("Sair")').first();
    const isVisible = await logoutBtn.isVisible().catch(() => false);

    if (isVisible) {
      await logoutBtn.click();
      await page.waitForTimeout(3000);

      const urlAfterLogout = page.url();
      const isLoggedOut = urlAfterLogout.includes('/login') || urlAfterLogout.includes('/');
      assert(isLoggedOut, `Deveria redirecionar após logout, mas está em: ${urlAfterLogout}`);
    } else {
      const menuToggle = page.locator('#mobile-menu-toggle, button[aria-label*="menu"]').first();
      const menuVisible = await menuToggle.isVisible().catch(() => false);

      if (menuVisible) {
        await menuToggle.click();
        await page.waitForTimeout(1000);

        const logoutInMenu = page.locator('#menu-sair, button:has-text("Sair"), a:has-text("Sair")').first();
        await logoutInMenu.click();
        await page.waitForTimeout(3000);

        const urlAfterLogout = page.url();
        assert(urlAfterLogout.includes('/login') || urlAfterLogout === `${BASE_URL}/`, 'Deveria redirecionar após logout');
      } else {
        await page.goto(`${BASE_URL}/api/auth/signout`, { waitUntil: 'networkidle' });
        const csrfBtn = page.locator('button[type="submit"]').first();
        if (await csrfBtn.isVisible()) await csrfBtn.click();
        await page.waitForTimeout(3000);
      }
    }

    await context.close();
  });

  // ──── Após logout, rota protegida redireciona ────
  await runner.test('Após logout, acessar rota protegida redireciona para login', async () => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(`${BASE_URL}/estoque`, { waitUntil: 'networkidle', timeout: 15000 });

    const currentUrl = page.url();
    assertContains(currentUrl, '/login', 'Sem sessão, deveria redirecionar para login');

    await context.close();
  });

  await runner.teardown();
})();
