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

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { catalogueOf } from '../src/i18n/catalogue';
import { LOCALES, appPath, landingPath } from '../src/i18n/locales';

const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe('the landing\'s catalogues (VENT-109)', () => {
  const en = catalogueOf('en');

  it.each(LOCALES)('%s has every key, with the same placeholders', (locale) => {
    const messages = catalogueOf(locale);
    expect(Object.keys(messages).sort()).toEqual(Object.keys(en).sort());
    for (const key of Object.keys(en) as (keyof typeof en)[]) {
      expect(messages[key].trim(), `${locale} ${key}`).not.toBe('');
      expect(placeholders(messages[key]), `${locale} ${key}`).toEqual(placeholders(en[key]));
    }
  });

  it('routes each language as the app does, the app under /app', () => {
    expect(LOCALES.map(landingPath)).toEqual(['/', '/es/', '/fr/', '/de/', '/it/']);
    expect(LOCALES.map(appPath)).toEqual(['/app/', '/app/es/', '/app/fr/', '/app/de/', '/app/it/']);
  });
});

describe('the landing\'s signal colours', () => {
  const tokens = (url: URL) => {
    const css = readFileSync(url, 'utf8');
    const first = css.slice(0, css.indexOf('@media'));
    return Object.fromEntries([...first.matchAll(/--(signal-[a-z]+):\s*(#[0-9a-f]{6})/g)].map((m) => [m[1], m[2]]));
  };

  it('are the app\'s, so a colour means the same on both', () => {
    const app = tokens(new URL('../../web/src/styles/tokens.css', import.meta.url));
    const landing = tokens(new URL('../src/styles/base.css', import.meta.url));
    expect(Object.keys(landing).sort()).toEqual(['signal-earth', 'signal-none', 'signal-sun', 'signal-window']);
    for (const [name, value] of Object.entries(landing)) expect(value, name).toBe(app[name]);
  });
});
