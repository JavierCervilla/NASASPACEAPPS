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

// VENT-126: the credits, the desktop Layers key's last block and the end of the phone's Settings page: the source link
// (a new tab, no opener, no referrer, an SVG arrow), the AI credit and the Space Apps disclaimer, from the catalogue.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Credits } from '../src/components/credits/Credits';
import { I18nContext } from '../src/components/i18n-context';
import type { UiLocale } from '../src/i18n/locales';
import { SOURCE_CODE_URL } from '../src/lib/source-code';
import { rulesOf, sheet } from './css-rules';
import { i18nOf } from './i18n-factories';

const render = (locale: UiLocale) =>
  renderToStaticMarkup(createElement(I18nContext, { value: i18nOf(locale) }, createElement(Credits)));

describe('the credits block', () => {
  it('links the public repository in a new tab, without the opener or the referrer', () => {
    expect(SOURCE_CODE_URL).toBe('https://github.com/JavierCervilla/NASASPACEAPPS');
    const html = render('en');
    expect(html).toContain(`href="${SOURCE_CODE_URL}"`);
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain('aria-label="Source code on GitHub, in a new tab"');
  });

  it('draws the arrow as an SVG hidden from assistive technology, never the arrow character', () => {
    const html = render('en');
    expect(html).toMatch(/Source code on GitHub<svg[^>]*class="credits__icon"[^>]*aria-hidden="true"/);
    expect(html).not.toContain('↗');
  });

  it('credits the AI and says Space Apps is not endorsed by NASA, in English and in Spanish', () => {
    const en = render('en');
    expect(en).toContain('<p>Built with Claude (AI) as a coding assistant</p>');
    expect(en).toContain('<p>Built for the NASA Space Apps Challenge. Not endorsed by NASA.</p>');
    const es = render('es');
    expect(es).toContain('Código fuente en GitHub<svg');
    expect(es).toContain('<p>Hecho con Claude (IA) como asistente de programación</p>');
    expect(es).toContain('<p>Hecho para el NASA Space Apps Challenge. Sin respaldo de la NASA.</p>');
  });

  it.each(['en', 'es', 'fr', 'de', 'it'] as const)('%s keeps Claude, GitHub, NASA and Space Apps untranslated', (locale) => {
    const html = render(locale);
    for (const name of ['Claude', 'GitHub', 'NASA', 'Space Apps']) expect(html, name).toContain(name);
  });

  it('gives the caption-sized link a 44 px target through its ::after', () => {
    const after = rulesOf(sheet('credits.css')).find((rule) => rule.selectors.includes('.credits__source::after'));
    expect(after?.body).toMatch(/inset:\s*calc\(50% - 22px\) 0/);
  });
});
