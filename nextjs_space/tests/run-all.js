const path = require('path');
const { execSync } = require('child_process');

const SKILL_DIR = path.resolve(__dirname, '../../.agent/skills/skills/playwright-skill');
const TESTS_DIR = path.resolve(__dirname);

const ALL_TESTS = [
  // Fase 1 - Auth
  'e2e/auth/login.spec.js',
  'e2e/auth/logout.spec.js',
  // Fase 2 - PDV
  'e2e/pdv/venda-simples.spec.js',
  // Fase 3 - Caixa
  'e2e/caixa/caixa-operacoes.spec.js',
  // Fase 4 - Estoque
  'e2e/estoque/estoque-produtos.spec.js',
  // Fase 7 - Middleware
  'e2e/middleware/role-access.spec.js',
  // Fase 10 - Dark Mode
  'e2e/misc/dark-mode.spec.js',
  // API Tests
  'api/auth.api.test.js',
  'api/products.api.test.js',
  'api/sales-caixa.api.test.js',
  'api/misc.api.test.js',
];

const target = process.argv[2];

function runTest(testFile) {
  const fullPath = path.resolve(TESTS_DIR, testFile);
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`▶️  Executando: ${testFile}`);
  console.log(`${'═'.repeat(60)}\n`);

  try {
    const isWindows = process.platform === 'win32';
    const cmd = `node "${path.join(TESTS_DIR, 'run-test.js')}" "${testFile}"`;
    
    execSync(cmd, {
      stdio: 'inherit',
      timeout: 120000,
      cwd: path.resolve(TESTS_DIR, '..'),
      env: {
        ...process.env,
        NODE_PATH: path.join(SKILL_DIR, 'node_modules')
      }
    });
  } catch (error) {
    console.log(`\n⚠️  Teste ${testFile} finalizou com erros\n`);
  }
}

if (target === '--all') {
  console.log('🧪 Executando TODOS os testes...\n');
  ALL_TESTS.forEach(runTest);
} else if (target) {
  const matchedTests = ALL_TESTS.filter(t => t.includes(target));
  if (matchedTests.length === 0) {
    console.log(`❌ Nenhum teste encontrado contendo "${target}"`);
    console.log('Testes disponíveis:');
    ALL_TESTS.forEach(t => console.log(`  • ${t}`));
    process.exit(1);
  }
  matchedTests.forEach(runTest);
} else {
  console.log('🧪 Flow PDV - Suite de Testes Automatizados\n');
  console.log('Uso:');
  console.log('  node run-all.js --all          # Todos os testes');
  console.log('  node run-all.js auth            # Testes de auth');
  console.log('  node run-all.js pdv             # Testes do PDV');
  console.log('  node run-all.js api             # Testes de API');
  console.log('  node run-all.js dark-mode       # Teste dark mode');
  console.log('  node run-all.js middleware       # Testes middleware');
  console.log('\nTestes disponíveis:');
  ALL_TESTS.forEach(t => console.log(`  • ${t}`));
}
