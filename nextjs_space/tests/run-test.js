const path = require('path');

const SKILL_DIR = path.resolve(__dirname, '../../.agent/skills/skills/playwright-skill');

const skillNodeModules = path.join(SKILL_DIR, 'node_modules');
if (!module.paths.includes(skillNodeModules)) {
  module.paths.unshift(skillNodeModules);
}

const testFile = process.argv[2];
if (!testFile) {
  console.error('Uso: node run-test.js <caminho-do-teste>');
  process.exit(1);
}

const fullPath = path.resolve(__dirname, testFile);
console.log(`🎭 Executando: ${fullPath}\n`);

require(fullPath);
