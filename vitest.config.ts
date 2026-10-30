import { defineConfig } from 'vitest/config';

// Each package's unit tests live in packages/<package>/tests/, and the tests of the local ESLint rules next to them in
// eslint-rules/; the e2e suite in tests/e2e/ belongs to Playwright.
export default defineConfig({
  test: { include: ['packages/*/tests/**/*.test.ts', 'eslint-rules/**/*.test.mjs'] },
});
