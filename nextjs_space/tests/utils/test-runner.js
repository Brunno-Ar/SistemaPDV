const { chromium } = require('playwright');
const { BASE_URL } = require('./auth-helper');

class TestRunner {
  constructor(suiteName) {
    this.suiteName = suiteName;
    this.results = [];
    this.browser = null;
    this.startTime = null;
  }

  async setup(options = {}) {
    this.startTime = Date.now();
    this.browser = await chromium.launch({
      headless: options.headless !== undefined ? options.headless : false,
      slowMo: options.slowMo || 50,
    });
    console.log(`\n🧪 ══════════════════════════════════════════`);
    console.log(`   Suite: ${this.suiteName}`);
    console.log(`══════════════════════════════════════════\n`);
    return this.browser;
  }

  async test(name, fn) {
    const start = Date.now();
    try {
      await fn();
      const duration = Date.now() - start;
      this.results.push({ name, status: 'PASS', duration });
      console.log(`  ✅ ${name} (${duration}ms)`);
    } catch (error) {
      const duration = Date.now() - start;
      this.results.push({ name, status: 'FAIL', duration, error: error.message });
      console.log(`  ❌ ${name} (${duration}ms)`);
      console.log(`     └─ ${error.message}`);
    }
  }

  async teardown() {
    if (this.browser) await this.browser.close();

    const totalTime = Date.now() - this.startTime;
    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    const total = this.results.length;

    console.log(`\n══════════════════════════════════════════`);
    console.log(`📊 Resultado: ${passed}/${total} passaram | ${failed} falharam`);
    console.log(`⏱️  Tempo total: ${(totalTime / 1000).toFixed(1)}s`);

    if (failed > 0) {
      console.log(`\n❌ TESTES QUE FALHARAM:`);
      this.results.filter(r => r.status === 'FAIL').forEach(r => {
        console.log(`   • ${r.name}: ${r.error}`);
      });
    }

    console.log(`══════════════════════════════════════════\n`);

    return { passed, failed, total, totalTime, results: this.results };
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message || 'assertEqual'}: esperado "${expected}", recebeu "${actual}"`);
  }
}

function assertContains(text, substring, message) {
  if (!text || !text.includes(substring)) {
    throw new Error(`${message || 'assertContains'}: "${substring}" não encontrado em "${text}"`);
  }
}

function assertTruthy(value, message) {
  if (!value) throw new Error(`${message || 'assertTruthy'}: valor é falsy: ${value}`);
}

function assertGreaterThan(actual, expected, message) {
  if (actual <= expected) {
    throw new Error(`${message || 'assertGreaterThan'}: ${actual} não é maior que ${expected}`);
  }
}

function assertStatusCode(response, expectedStatus, message) {
  if (response.status !== expectedStatus) {
    throw new Error(
      `${message || 'assertStatusCode'}: esperado status ${expectedStatus}, recebeu ${response.status}. Body: ${JSON.stringify(response.data).substring(0, 200)}`
    );
  }
}

module.exports = {
  TestRunner,
  assert,
  assertEqual,
  assertContains,
  assertTruthy,
  assertGreaterThan,
  assertStatusCode,
};
