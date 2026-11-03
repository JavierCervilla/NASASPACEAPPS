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
 * Colour on the page's surfaces (VENT-55, findings C-06, C-07, C-08, C-12 and C-20 of VENT-53): the four signal colours
 * mean Sun, Earth, window and nothing, so a check mark or a loading bar never wears one; every token a stylesheet
 * reads exists; more contrast makes the chrome near opaque with a border on every floating surface; and grey text on
 * glass is heavier, a little looser and still 4.5:1.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { contrast, over } from './colour-math';
import { allSheets, declared, rootToken, rulesOf, sheet } from './css-rules';

const SHEETS = allSheets();
const ruleOf = (file: string, selector: string) => {
  const found = rulesOf(sheet(file)).find((rule) => rule.selector === selector && rule.at.length === 0);
  if (!found) throw new Error(`no ${selector} in ${file}`);
  return found;
};
const SIGNALS = /var\(--signal-(sun|earth|window|none)(-ink)?\)/;

describe('signal colours stay signals', () => {
  it('the current language\'s check is neutral, like the site list\'s (C-06)', () => {
    const check = declared(ruleOf('lang.css', '.lang-option__check').body, 'color') ?? '';
    expect(check).not.toMatch(SIGNALS);
    expect(check).toBe(declared(ruleOf('phone.css', '.site-row__check').body, 'color'));
  });

  it('the strip loads in the card\'s skeleton grey, not «neither» (C-07)', () => {
    const loading = declared(ruleOf('calendar.css', '.strip-status--loading').body, 'background') ?? '';
    expect(loading).not.toMatch(SIGNALS);
    expect(loading).toBe('var(--card-skeleton)');
  });
});

/** Every `.ts`, `.tsx` and `.astro` file under `src/`, as one text: where the script sets its custom properties. */
function sourceText(dir = new URL('../src/', import.meta.url)): string {
  return readdirSync(dir).map((name) => {
    const path = new URL(name, dir);
    if (statSync(path).isDirectory()) return sourceText(new URL(`${name}/`, dir));
    return /\.(tsx?|astro)$/.test(name) ? readFileSync(path, 'utf8') : '';
  }).join('\n');
}

describe('every token a stylesheet reads is set somewhere (C-08)', () => {
  const css = [...SHEETS.values()].join('\n');
  const script = sourceText();
  const read = [...new Set([...css.matchAll(/var\((--[\w-]+)/g)].map((m) => m[1] ?? ''))];
  it.each(read)('%s', (name) => {
    const declaredInCss = css.includes(`${name}:`);
    const setByScript = script.includes(`'${name}'`) || script.includes(`"${name}"`) || script.includes(`${name}:`);
    expect(declaredInCss || setByScript).toBe(true);
  });

  it('the pin readout, the hint and the update notice turn the theme\'s opaque surface under reduced transparency', () => {
    for (const [file, selector] of [['pin.css', '.pin-readout, .pin-hint'], ['update.css', '.update-notice[data-shown]']] as const) {
      const rule = rulesOf(sheet(file)).find((r) => r.selector === selector && r.at.some((m) => m.includes('reduced-transparency')));
      expect(declared(rule?.body ?? '', 'background')).toBe('var(--surface)');
    }
  });
});

/** The alpha of a colour token: 1 for `#rrggbb`. */
const alphaOf = (colour: string): number => (colour.startsWith('rgba') ? Number(/([\d.]+)\)$/.exec(colour)?.[1]) : 1);
const LIGHT = 'prefers-color-scheme: light';
const MORE = 'prefers-contrast: more';

describe('more contrast: near-opaque chrome and one border list (C-12)', () => {
  const chrome = ['--surface', '--chrome', '--glass-label', '--phone-bar', '--phone-sheet', '--phone-tabs'];
  for (const theme of [[MORE], [LIGHT, MORE]]) {
    it.each(chrome)(`%s is near opaque (${theme.join(' and ')})`, (name) => {
      expect(alphaOf(rootToken(name, theme))).toBeGreaterThanOrEqual(0.94);
    });
  }

  const SURFACES = [
    '.globe-layers', '.polar-key', '.pin-readout', '.pin-hint', '.update-notice[data-shown]', '.strip', '.site-popover',
    '.lang-popover', '.phone-bar', '.sheet', '.tab-bar', '.widget', '.site-list', '.settings-group', '.lang-list',
    '.saved-empty',
  ];
  const bordered = [...SHEETS.values()].flatMap((css) => rulesOf(css))
    .filter((rule) => rule.at.some((m) => m.includes(MORE)) && /var\(--surface-edge\)/.test(declared(rule.body, 'border') ?? ''))
    .flatMap((rule) => rule.selector.split(',').map((s) => s.trim()));
  it.each(SURFACES)('%s gains the contrasting border', (surface) => {
    expect(bordered).toContain(surface);
  });
});

/** The darkest backdrop each glass surface is read over: the sky for the globe's, the page for the header. */
const GLASS_TEXT = [
  { name: 'Layers title, layer notes and counts', surface: '--surface', under: '#07080b' },
  { name: 'polar key title', surface: '--surface', under: '--map-panel' },
  { name: 'header subtitle', surface: '--chrome', under: '--bg' },
  { name: 'header site button place line', surface: '--chrome', under: '--bg' },
  { name: 'phone tabs', surface: '--phone-tabs', under: '#07080b' },
];
const solid = (value: string, theme: string[]) => (value.startsWith('--') ? rootToken(value, theme) : value);

describe('grey text on glass keeps 4.5:1 (C-20)', () => {
  for (const theme of [[], [LIGHT]]) {
    it.each(GLASS_TEXT)(`$name (${theme.join() || 'dark'})`, ({ surface, under }) => {
      const glass = over(rootToken(surface, theme), solid(under, theme));
      expect(contrast(rootToken('--text-muted', theme), glass)).toBeGreaterThanOrEqual(4.5);
    });
  }
});

describe('grey text on glass is heavier and a little looser (C-20)', () => {
  const PAGE = readFileSync(new URL('../src/components/Page.astro', import.meta.url), 'utf8');
  const cases: [string, string][] = [
    ['globe.css', '.globe-layers h2'], ['polar.css', '.polar-key__title'], ['saved.css', '.layer-row__count'],
    ['saved.css', '.layer-row__note'], ['phone.css', '.tab'], ['calendar.css', '.site-button__place'],
  ];
  const rules = [
    ...cases.map(([file, selector]) => ruleOf(file, selector)),
    rulesOf(PAGE.slice(PAGE.indexOf('<style>'))).find((rule) => rule.selector === '.subtitle'),
  ];
  it.each(rules.map((rule) => [rule?.selector, rule]))('%s', (_, rule) => {
    expect(Number(declared(rule?.body ?? '', 'font-weight'))).toBeGreaterThanOrEqual(500);
    expect(declared(rule?.body ?? '', 'letter-spacing')).toMatch(/^(0\.01em|var\(--type-[\w-]+-tracking\))$/);
  });
});
