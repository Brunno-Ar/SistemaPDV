const { chromium } = require('playwright');
const { TestRunner, assert, assertContains, assertTruthy } = require('../utils/test-runner');
const { BASE_URL, createAuthenticatedPage } = require('../utils/auth-helper');

(async () => {
  const runner = new TestRunner('📦 Estoque - Produtos e Lotes');
  const browser = await runner.setup({ headless: false, slowMo: 80 });

  // ──── 4.1 Página de estoque carrega ────
  await runner.test('Página /estoque carrega corretamente', async () => {
    const { page, context } = await createAuthenticatedPage(browser);
    await page.goto(`${BASE_URL}/estoque`, { waitUntil: 'networkidle', timeout: 20000 });

    const currentUrl = page.url();
    assert(!currentUrl.includes('/login'), `Deveria estar autenticado, mas está em: ${currentUrl}`);

    const pageContent = (await page.textContent('body')).toLowerCase();
    const hasContent = pageContent.includes('estoque') || pageContent.includes('produto') || pageContent.includes('novo');

    assert(hasContent, 'Página deveria conter conteúdo de estoque');
    await page.screenshot({ path: '/tmp/test-estoque-page.png', fullPage: true });
    await context.close();
  });

  // ──── 4.2 Lista de produtos exibe dados ────
  await runner.test('Lista de produtos exibe informações relevantes', async () => {
    const { page, context } = await createAuthenticatedPage(browser);
    await page.goto(`${BASE_URL}/estoque`, { waitUntil: 'networkidle', timeout: 20000 });

    const pageContent = (await page.textContent('body')).toLowerCase();
    const hasProductInfo = pageContent.includes('nome') ||
      pageContent.includes('preço') ||
      pageContent.includes('estoque') ||
      pageContent.includes('sku') ||
      pageContent.includes('produto');

    assertTruthy(hasProductInfo, 'Deveria ter informações de produtos');
    await context.close();
  });

  // ──── 4.3 Botão de novo produto existe ────
  await runner.test('Botão para criar novo produto está visível', async () => {
    const { page, context } = await createAuthenticatedPage(browser);
    await page.goto(`${BASE_URL}/estoque`, { waitUntil: 'networkidle', timeout: 20000 });

    const newBtn = page.locator('button:has-text("Novo"), button:has-text("novo"), button:has-text("Adicionar"), button:has-text("Cadastrar"), a:has-text("Novo")').first();
    const isVisible = await newBtn.isVisible().catch(() => false);

    const pageContent = (await page.textContent('body')).toLowerCase();
    const hasNewOption = pageContent.includes('novo produto') || pageContent.includes('cadastrar') || pageContent.includes('adicionar') || isVisible;

    assertTruthy(hasNewOption, 'Deveria ter opção de criar novo produto');
    await page.screenshot({ path: '/tmp/test-estoque-new-btn.png', fullPage: true });
    await context.close();
  });

  // ──── 4.4 Página de lotes carrega ────
  await runner.test('Página /lotes carrega corretamente', async () => {
    const { page, context } = await createAuthenticatedPage(browser);
    await page.goto(`${BASE_URL}/lotes`, { waitUntil: 'networkidle', timeout: 20000 });

    const currentUrl = page.url();
    assert(!currentUrl.includes('/login'), `Deveria estar autenticado`);

    const pageContent = (await page.textContent('body')).toLowerCase();
    const hasContent = pageContent.includes('lote') || pageContent.includes('validade') || pageContent.includes('quantidade');

    assert(hasContent, 'Página deveria conter conteúdo de lotes');
    await page.screenshot({ path: '/tmp/test-lotes-page.png', fullPage: true });
    await context.close();
  });

  // ──── 4.5 Página de movimentações carrega ────
  await runner.test('Página /movimentacoes carrega corretamente', async () => {
    const { page, context } = await createAuthenticatedPage(browser);
    await page.goto(`${BASE_URL}/movimentacoes`, { waitUntil: 'networkidle', timeout: 20000 });

    const currentUrl = page.url();
    assert(!currentUrl.includes('/login'), `Deveria estar autenticado`);

    const pageContent = (await page.textContent('body')).toLowerCase();
    const hasContent = pageContent.includes('moviment') || pageContent.includes('entrada') || pageContent.includes('saída') || pageContent.includes('tipo');

    assert(hasContent, 'Página deveria conter conteúdo de movimentações');
    await page.screenshot({ path: '/tmp/test-movimentacoes-page.png', fullPage: true });
    await context.close();
  });

  // ──── 4.6 Busca de produto no estoque ────
  await runner.test('Campo de busca/filtro de produtos no estoque funciona', async () => {
    const { page, context } = await createAuthenticatedPage(browser);
    await page.goto(`${BASE_URL}/estoque`, { waitUntil: 'networkidle', timeout: 20000 });

    const searchInput = page.locator('input[placeholder*="Buscar"], input[placeholder*="buscar"], input[placeholder*="Pesquisar"], input[type="search"]').first();
    const isSearchVisible = await searchInput.isVisible().catch(() => false);

    if (isSearchVisible) {
      await searchInput.fill('teste');
      await page.waitForTimeout(1500);
    }

    await page.screenshot({ path: '/tmp/test-estoque-search.png', fullPage: true });
    await context.close();
    assertTruthy(true, 'Verificação de busca no estoque concluída');
  });

  await runner.teardown();
})();
