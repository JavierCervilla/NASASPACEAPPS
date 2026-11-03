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

/**
 * The focus ring (VENT-55, finding C-09 of VENT-53): one token on the page's surfaces, `--focus-ring` (the text
 * colour, so it is dark on light glass and light on dark), and `--focus-ring-on-moon` (the markers' white) only on
 * what sits on the Moon and its sky, which stays dark in both themes. A white ring on the light theme's white glass
 * could not be seen. Buttons and links without their own ring take a common one from global.css.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { allStyleSheets, declared, rootToken, rulesOf, styleSheet } from './css-rules';

const PAGE = readFileSync(new URL('../src/components/Page.astro', import.meta.url), 'utf8');
const SHEETS: [string, string][] = [...Object.entries(allStyleSheets()), ['Page.astro', PAGE.slice(PAGE.indexOf('<style>'))]];
/** On the Moon or its sky: the markers, the pins, the globe and the buttons drawn over it. */
const ON_MOON = [
  '.globe-viewport', '.globe-marker', '.polar-marker', '.globe-point', '.polar-saved', '.pin', '.compass', '.globe-load',
];
/** The on-foot view draws its own dark scene and rings in its own ink (on-foot.css). */
const OWN_SCENE = new Set(['on-foot.css']);

const focusRules = SHEETS.filter(([file]) => !OWN_SCENE.has(file)).flatMap(([file, css]) =>
  rulesOf(css).filter((rule) => /:focus/.test(rule.selector)).map((rule) => ({ file, ...rule })));
/** The colour a focus rule draws its ring in, if it draws one. */
function ringColour(body: string): string | undefined {
  const ring = [declared(body, 'outline'), declared(body, 'outline-color'), declared(body, 'box-shadow')].filter(Boolean).join(' ');
  return /var\((--[\w-]+)\)/.exec(ring)?.[1];
}

describe('the focus tokens', () => {
  it('ring in the text colour on the page and in the markers\' white on the Moon, in both themes', () => {
    for (const theme of [[], ['prefers-color-scheme: light']]) {
      expect(rootToken('--focus-ring', theme)).toBe('var(--text)');
      expect(rootToken('--focus-ring-on-moon', theme)).toBe('var(--marker)');
    }
  });
});

describe('every focus ring uses a focus token, the Moon\'s only on the Moon', () => {
  it.each(focusRules.filter((rule) => ringColour(rule.body)).map((rule) => [`${rule.file} ${rule.selector}`, rule]))('%s', (_, rule) => {
    const colour = ringColour(rule.body);
    const onMoon = rule.selector.split(',').every((part) => ON_MOON.some((s) => new RegExp(`^${s.replace('.', '\\.')}[:\\s]`).test(part.trim())));
    expect(colour).toBe(onMoon ? '--focus-ring-on-moon' : '--focus-ring');
  });
});

describe('a common ring for the controls without their own', () => {
  const common = rulesOf(styleSheet('global.css')).find((rule) => rule.selector.startsWith(':where(') && rule.selector.endsWith(':focus-visible'));
  it('is a zero-specificity rule in global.css, so a control\'s own ring still wins', () => {
    expect(common?.selector).toMatch(/:where\([^)]*\bbutton\b[^)]*\ba\b|:where\([^)]*\ba\b[^)]*\bbutton\b/);
    expect(declared(common?.body ?? '', 'outline')).toBe('2px solid var(--focus-ring)');
  });

  it('the globe\'s «Load the 3D globe» rings in the Moon\'s white, over the sky', () => {
    const rule = rulesOf(styleSheet('globe.css')).find((r) => r.selector === '.globe-load:focus-visible');
    expect(ringColour(rule?.body ?? '')).toBe('--focus-ring-on-moon');
  });
});
