/*
 *   _   _       _                         _ _
 *  | | | |_ __ (_)_   _____ _ __ ___  ___| | | ___
 *  | | | | '_ \| \ \ / / _ \ '__/ __|/ _ \ | |/ _ \
 *  | |_| | | | | |\ V /  __/ |  \__ \  __/ | |  __/
 *   \___/|_| |_|_| \_/ \___|_|  |___/\___|_|_|\___|
 *
 *             =++==--::.
 *         %%%%##**++=--:..  .
 *      ##**#%@%%#***+=--::.   .
 *    #**=+*#*#**#++++=-:::.. .  .
 *   #++-====*@%+*++==--::...   .  .    Ventana Lunar
 *  #+=-=--++==+===-+==--:..   .  .  .  Sun, Earth and landing
 * #----====-------=-=---:..  .  .  .   windows at the lunar
 * #+---+=====--=---==-::..     .  .  . south pole
 * #*----==---==-=-=-:-....    .  .  .
 * *#----===+*===--:-::...    .  .  .   Built for the NASA Space
 *  *----=*-+*%*+=-:::....   .  .  .    Apps Challenge 2026,
 *   *------=+*=--:::-:::.. .  .  .     Madrid. Not endorsed
 *    %*===-=-==--==-:::.  .  .  .      by NASA.
 *      *+:--+:--::::::.  .  .  .
 *         -=:::...:..   .  .           (c) 2026 Universelle
 *             :::.. .  .               SPDX-License-Identifier: MIT
 */

import astro from 'eslint-plugin-astro';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';
import antiSlop from './eslint.anti-slop.mjs';
import maxFunctionsPerFile from './eslint-rules/max-functions-per-file.mjs';

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
  // Clean Code limits (VENT-20): the 42 Norm, adapted to TypeScript, for production code only. Tests are exempt:
  // a describe block is long by nature, and a test file holds many small cases.
  {
    files: ['packages/*/src/**'],
    plugins: { local: { rules: { 'max-functions-per-file': maxFunctionsPerFile } } },
    rules: {
      'max-lines': ['error', { max: 200, skipBlankLines: true, skipComments: true }],
      'max-lines-per-function': ['error', { max: 25, skipBlankLines: true, skipComments: true }],
      'max-len': [
        'error',
        {
          code: 80,
          comments: 80,
          ignoreUrls: true,
          ignoreStrings: true,
          ignoreTemplateLiterals: true,
          ignoreRegExpLiterals: true,
        },
      ],
      'max-params': ['error', 4],
      'local/max-functions-per-file': ['error', { max: 5 }],
    },
  },
];
