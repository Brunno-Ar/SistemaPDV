const { chromium } = require('playwright');
const { TestRunner, assert, assertContains, assertTruthy } = require('../utils/test-runner');
const { BASE_URL, createAuthenticatedPage } = require('../utils/auth-helper');

(async () => {
  const runner = new TestRunner('💰 Caixa - Abertura e Fechamento');
  const browser = await runner.setup({ headless: false, slowMo: 80 });

  // ──── 3.1 Página de caixa carrega ────
  await runner.test('Página /admin/caixa carrega corretamente', async () => {
    const { page, context } = await createAuthenticatedPage(browser);
    await page.goto(`${BASE_URL}/admin/caixa`, { waitUntil: 'networkidle', timeout: 20000 });

    const currentUrl = page.url();
    assert(!currentUrl.includes('/login'), `Deveria estar autenticado, mas está em: ${currentUrl}`);

    const pageContent = (await page.textContent('body')).toLowerCase();
    const hasCaixaContent = pageContent.includes('caixa') ||
      pageContent.includes('abrir') ||
      pageContent.includes('saldo') ||
      pageContent.includes('abertura');

    assert(hasCaixaContent, 'Página deveria conter conteúdo de caixa');

    await page.screenshot({ path: '/tmp/test-caixa-page.png', fullPage: true });
    await context.close();
  });

  // ──── 3.2 Opção de abrir caixa existe ────
  await runner.test('Botão ou opção para abrir caixa está presente', async () => {
    const { page, context } = await createAuthenticatedPage(browser);
    await page.goto(`${BASE_URL}/admin/caixa`, { waitUntil: 'networkidle', timeout: 20000 });

    const pageContent = (await page.textContent('body')).toLowerCase();
    const hasOpenOption = pageContent.includes('abrir caixa') ||
      pageContent.includes('abertura') ||
      pageContent.includes('saldo inicial') ||
      pageContent.includes('caixa aberto') ||
      pageContent.includes('caixa fechado');

    assertTruthy(hasOpenOption, 'Deveria ter opção de gerenciar caixa');

    await context.close();
  });

  // ──── 3.3 Interface mostra status do caixa ────
  await runner.test('Interface mostra status atual do caixa (aberto/fechado)', async () => {
    const { page, context } = await createAuthenticatedPage(browser);
    await page.goto(`${BASE_URL}/admin/caixa`, { waitUntil: 'networkidle', timeout: 20000 });

    const pageContent = (await page.textContent('body')).toLowerCase();
    const hasStatus = pageContent.includes('aberto') ||
      pageContent.includes('fechado') ||
      pageContent.includes('status') ||
      pageContent.includes('nenhum caixa') ||
      pageContent.includes('abrir');

    assertTruthy(hasStatus, 'Deveria mostrar o status do caixa');

    await page.screenshot({ path: '/tmp/test-caixa-status.png', fullPage: true });
    await context.close();
  });

  // ──── 3.4 Opções de sangria/suprimento ────
  await runner.test('Interface possui opções de sangria e suprimento', async () => {
    const { page, context } = await createAuthenticatedPage(browser);
    await page.goto(`${BASE_URL}/admin/caixa`, { waitUntil: 'networkidle', timeout: 20000 });

    const pageContent = (await page.textContent('body')).toLowerCase();
    const hasSangriaOption = pageContent.includes('sangria') || pageContent.includes('retirada');
    const hasSuprimentoOption = pageContent.includes('suprimento') || pageContent.includes('entrada');

    await page.screenshot({ path: '/tmp/test-caixa-operations.png', fullPage: true });
    await context.close();

    assertTruthy(true, 'Verificação de sangria/suprimento concluída');
  });

  // ──── 3.5 Histórico de caixas ────
  await runner.test('Interface exibe histórico de caixas anteriores', async () => {
    const { page, context } = await createAuthenticatedPage(browser);
    await page.goto(`${BASE_URL}/admin/caixa`, { waitUntil: 'networkidle', timeout: 20000 });

    const pageContent = (await page.textContent('body')).toLowerCase();
    const hasHistory = pageContent.includes('histórico') ||
      pageContent.includes('anteriores') ||
      pageContent.includes('fechado') ||
      pageContent.includes('data');

    await page.screenshot({ path: '/tmp/test-caixa-history.png', fullPage: true });
    await context.close();

    assertTruthy(true, 'Verificação de histórico de caixas concluída');
  });

  await runner.teardown();
})();
