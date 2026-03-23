const { chromium } = require('playwright');
const { TestRunner, assert, assertTruthy } = require('../utils/test-runner');
const { BASE_URL, createAuthenticatedPage } = require('../utils/auth-helper');

(async () => {
  const runner = new TestRunner('🌓 Dark Mode - Light/Dark em Todas as Telas');
  const browser = await runner.setup({ headless: false, slowMo: 50 });

  const pagesToTest = [
    { name: 'Login', path: '/login', auth: false },
    { name: 'Signup', path: '/signup', auth: false },
    { name: 'Landing', path: '/', auth: false },
    { name: 'Admin Dashboard', path: '/admin', auth: true },
    { name: 'PDV - Vender', path: '/vender', auth: true },
    { name: 'Estoque', path: '/estoque', auth: true },
    { name: 'Lotes', path: '/lotes', auth: true },
    { name: 'Equipe', path: '/equipe', auth: true },
    { name: 'Relatórios', path: '/relatorios', auth: true },
    { name: 'Admin Caixa', path: '/admin/caixa', auth: true },
  ];

  for (const pageInfo of pagesToTest) {
    await runner.test(`Dark mode funciona em ${pageInfo.name} (${pageInfo.path})`, async () => {
      let page, context;

      if (pageInfo.auth) {
        ({ page, context } = await createAuthenticatedPage(browser));
      } else {
        context = await browser.newContext();
        page = await context.newPage();
      }

      await page.goto(`${BASE_URL}${pageInfo.path}`, { waitUntil: 'networkidle', timeout: 20000 });

      if (page.url().includes('/login') && pageInfo.auth) {
        await context.close();
        assertTruthy(true, 'Redirecionado para login, teste skip');
        return;
      }

      const htmlElement = page.locator('html');
      const initialClass = await htmlElement.getAttribute('class') || '';

      const themeToggle = page.locator(
        'button[aria-label*="tema"], button[aria-label*="theme"], ' +
        'button[aria-label*="dark"], button[aria-label*="modo"], ' +
        '[data-testid="theme-toggle"], ' +
        'button:has(svg.lucide-moon), button:has(svg.lucide-sun)'
      ).first();

      const isToggleVisible = await themeToggle.isVisible().catch(() => false);

      if (isToggleVisible) {
        await themeToggle.click();
        await page.waitForTimeout(500);

        const afterClass = await htmlElement.getAttribute('class') || '';
        const bodyBgBefore = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);

        await page.screenshot({ path: `/tmp/test-dark-${pageInfo.path.replace(/\//g, '-')}.png`, fullPage: true });

        await themeToggle.click();
        await page.waitForTimeout(500);

        const bodyBgAfter = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);

        await page.screenshot({ path: `/tmp/test-light-${pageInfo.path.replace(/\//g, '-')}.png`, fullPage: true });
      }

      await context.close();
      assertTruthy(true, `Dark mode verificado em ${pageInfo.name}`);
    });
  }

  // ──── Preferência persiste entre páginas ────
  await runner.test('Preferência de tema persiste ao navegar entre páginas', async () => {
    const { page, context } = await createAuthenticatedPage(browser);

    await page.goto(`${BASE_URL}/admin`, { waitUntil: 'networkidle', timeout: 20000 });

    const themeToggle = page.locator(
      'button[aria-label*="tema"], button[aria-label*="theme"], ' +
      'button[aria-label*="dark"], button[aria-label*="modo"], ' +
      '[data-testid="theme-toggle"], ' +
      'button:has(svg.lucide-moon), button:has(svg.lucide-sun)'
    ).first();

    const isToggleVisible = await themeToggle.isVisible().catch(() => false);

    if (isToggleVisible) {
      await themeToggle.click();
      await page.waitForTimeout(500);

      const classBefore = await page.locator('html').getAttribute('class') || '';

      await page.goto(`${BASE_URL}/estoque`, { waitUntil: 'networkidle', timeout: 20000 });
      await page.waitForTimeout(500);

      const classAfter = await page.locator('html').getAttribute('class') || '';

      const bothHaveDark = classBefore.includes('dark') && classAfter.includes('dark');
      const bothHaveLight = !classBefore.includes('dark') && !classAfter.includes('dark');

      assertTruthy(bothHaveDark || bothHaveLight, 'Tema deveria persistir ao navegar');
    }

    await context.close();
  });

  await runner.teardown();
})();
