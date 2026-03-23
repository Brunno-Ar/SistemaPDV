const { chromium } = require('playwright');

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

const CREDENTIALS = {
  admin: { email: 'admin@pdv.com', password: 'admin123' },
};

async function loginAndGetCookies(role = 'admin') {
  const creds = CREDENTIALS[role];
  if (!creds) throw new Error(`Credenciais não encontradas para role: ${role}`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForSelector('input[name="email"], input[type="email"], #email', { timeout: 10000 });

  const emailSelector = await page.$('input[name="email"]') || await page.$('input[type="email"]') || await page.$('#email');
  const passwordSelector = await page.$('input[name="password"]') || await page.$('input[type="password"]') || await page.$('#password');

  if (!emailSelector || !passwordSelector) {
    await page.screenshot({ path: '/tmp/login-debug.png', fullPage: true });
    throw new Error('Campos de login não encontrados. Screenshot salvo em /tmp/login-debug.png');
  }

  await emailSelector.fill(creds.email);
  await passwordSelector.fill(creds.password);

  const submitBtn = await page.$('button[type="submit"]');
  if (submitBtn) await submitBtn.click();

  try {
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 });
  } catch {
    await page.screenshot({ path: '/tmp/login-fail.png', fullPage: true });
    throw new Error('Login falhou - não redirecionou. Screenshot em /tmp/login-fail.png');
  }

  const cookies = await context.cookies();
  const storageState = await context.storageState();

  await browser.close();

  return { cookies, storageState, baseUrl: BASE_URL };
}

async function createAuthenticatedContext(browser, role = 'admin') {
  const { storageState } = await loginAndGetCookies(role);
  const context = await browser.newContext({ storageState });
  return context;
}

async function createAuthenticatedPage(browser, role = 'admin') {
  const context = await createAuthenticatedContext(browser, role);
  const page = await context.newPage();
  return { page, context };
}

async function getSessionCookie(role = 'admin') {
  const { cookies } = await loginAndGetCookies(role);
  const sessionCookie = cookies.find(c => 
    c.name.includes('next-auth.session-token') || 
    c.name.includes('__Secure-next-auth.session-token')
  );
  if (!sessionCookie) throw new Error('Cookie de sessão não encontrado');
  return sessionCookie;
}

module.exports = {
  BASE_URL,
  CREDENTIALS,
  loginAndGetCookies,
  createAuthenticatedContext,
  createAuthenticatedPage,
  getSessionCookie,
};
