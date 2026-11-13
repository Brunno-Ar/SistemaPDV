const nextJest = require("next/jest");

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: "./",
});

// Add any custom config to be passed to Jest
const customJestConfig = {
  coverageProvider: "v8",
  testEnvironment: "jsdom",
  // Guard fail-closed: sobrescreve DATABASE_URL/DIRECT_URL com URL dummy LOCAL
  // ANTES de qualquer import do Prisma/@/lib/db, impedindo herda URL de
  // produção do .env. Não abre conexão.
  setupFiles: ["<rootDir>/lib/prisma-guard.ts"],
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig);
