import astro from 'eslint-plugin-astro';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';
import antiSlop from './eslint.anti-slop.mjs';

export default [
  { ignores: ['**/dist/', '**/.astro/', '**/node_modules/', '.english-gate/', 'playwright-report/', 'test-results/', '.claude/'] },
  ...tseslint.configs.recommended,
  ...astro.configs.recommended,
  {
    files: ['**/*.tsx'],
    plugins: { 'react-hooks': reactHooks },
    rules: reactHooks.configs.recommended.rules,
  },
  ...antiSlop,
  // Ratchet: the repo starts clean, so the preset's warn-level rules bite from day one (tests and configs stay relaxed).
  {
    files: ['packages/*/src/**'],
    rules: {
      'sonarjs/no-identical-functions': 'error',
      'sonarjs/no-duplicate-string': ['error', { threshold: 5 }],
      'sonarjs/cognitive-complexity': ['error', 15],
      'import/no-cycle': ['error', { maxDepth: 6 }],
    },
  },
];
