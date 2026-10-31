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

import { RuleTester } from 'eslint';
import { describe, it } from 'vitest';
import rule from './no-literal-ui-text.mjs';

RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const tester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2024,
    sourceType: 'module',
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});
const allow = [{ allow: ['Ventana Lunar'] }];

tester.run('no-literal-ui-text', rule, {
  valid: [
    { name: 'text from the catalogue', code: "const a = <p>{t('picker.empty')}</p>;" },
    { name: 'an attribute from the catalogue', code: "const a = <ul aria-label={t('picker.list')} />;" },
    { name: 'text without letters is not language', code: 'const a = <span>{n} · 0° – 85°</span>;' },
    { name: 'whitespace between elements', code: 'const a = <p>\n  <b />\n</p>;' },
    { name: 'an allowed proper noun', code: 'const a = <h1>Ventana Lunar</h1>;', options: allow },
    { name: 'attributes nobody reads', code: 'const a = <a className="lang-option" role="menuitemradio" href="/es/" />;' },
    { name: 'a computed attribute', code: 'const a = <img alt={thumb.alt} />;' },
    { name: 'an empty alt for a decorative image', code: 'const a = <img alt="" />;' },
  ],
  invalid: [
    {
      name: 'JSX text with words',
      code: 'const a = <p>No sites match.</p>;',
      errors: [{ messageId: 'text', data: { text: 'No sites match.' } }],
    },
    {
      name: 'a literal aria-label',
      code: 'const a = <nav aria-label="Views" />;',
      errors: [{ messageId: 'attribute', data: { name: 'aria-label', text: 'Views' } }],
    },
    {
      name: 'a literal in an expression container',
      code: "const a = <input placeholder={'Search a site'} />;",
      errors: [{ messageId: 'attribute', data: { name: 'placeholder', text: 'Search a site' } }],
    },
    {
      name: 'a template with words',
      code: 'const a = <button aria-label={`Change site, now ${name}`} />;',
      errors: [{ messageId: 'attribute', data: { name: 'aria-label', text: 'Change site, now' } }],
    },
    {
      name: 'alt and title too',
      code: 'const a = <><img alt="The Moon" /><span title="Coming soon" /></>;',
      errors: [{ messageId: 'attribute' }, { messageId: 'attribute' }],
    },
    {
      name: 'a proper noun not in the allow list',
      code: 'const a = <h1>Ventana Lunar</h1>;',
      errors: [{ messageId: 'text' }],
    },
  ],
});
