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
import { VISOR_TOKENS } from '../src/astronaut/figure-types';

const TOKENS = readFileSync(new URL('../src/styles/tokens.css', import.meta.url), 'utf8');
const PHONE = readFileSync(new URL('../src/styles/phone.css', import.meta.url), 'utf8');

/** The custom properties set in the first block that follows `marker` in `css`. */
function block(css: string, marker: string): Record<string, string> {
  const start = css.indexOf(marker);
  if (start === -1) throw new Error(`no block ${marker}`);
  const body = css.slice(start, css.indexOf('}', css.indexOf(':root', start)));
  return Object.fromEntries([...body.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2]?.trim()]));
}

/** WCAG 2 relative luminance of a `#rrggbb` colour. */
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = Number.parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0);
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return ((hi ?? 0) + 0.05) / ((lo ?? 0) + 0.05);
}

describe('light-mode label contrast on the phone cards', () => {
  const light = block(TOKENS, '@media (prefers-color-scheme: light) {');
  const card = block(PHONE, '@media (prefers-color-scheme: light) {')['--phone-card'] ?? '';

  it('reads the card as white', () => {
    expect(card).toBe('#ffffff');
  });

  // 12 px labels are small text: WCAG AA asks 4.5:1.
  it.each(['--signal-window-ink', '--signal-sun-ink', '--signal-earth-ink', '--text-muted'])('%s reaches 4.5:1 on the card', (token) => {
    const colour = light[token] ?? '';
    expect(colour).toMatch(/^#[0-9a-f]{6}$/i);
    expect(contrast(colour, card)).toBeGreaterThanOrEqual(4.5);
  });
});

/** `rgba(r, g, b, a)` over the opaque `#rrggbb` colour `under`, as `#rrggbb`. */
function over(rgba: string, under: string): string {
  const [r, g, b, a] = (rgba.match(/[\d.]+/g) ?? []).map(Number);
  const base = [1, 3, 5].map((i) => Number.parseInt(under.slice(i, i + 2), 16));
  const mixed = [r, g, b].map((c, i) => Math.round((a ?? 1) * (c ?? 0) + (1 - (a ?? 1)) * (base[i] ?? 0)));
  return `#${mixed.map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}

describe('light-mode signal words on the phone top bar (VENT-33)', () => {
  const light = block(TOKENS, '@media (prefers-color-scheme: light) {');
  const phone = block(PHONE, '@media (prefers-color-scheme: light) {');
  // The worst case: the bar's glass over the black sky at the screen's top, and the site pill's fill on it.
  const SKY = '#07080b';
  const bar = over(phone['--phone-bar'] ?? '', SKY);
  const pill = over(light['--fill'] ?? '', bar);

  it.each(['--bar-sun-ink', '--bar-earth-ink', '--bar-window-ink'])('%s reaches 4.5:1 on the bar and in the pill', (token) => {
    const colour = phone[token] ?? '';
    expect(colour).toMatch(/^#[0-9a-f]{6}$/i);
    expect(contrast(colour, bar)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(colour, pill)).toBeGreaterThanOrEqual(4.5);
  });

  it('keeps the rule\'s «+» and «=» and a plain state line, in the secondary text, at 4.5:1 in the pill', () => {
    expect(contrast(light['--text-secondary'] ?? '', pill)).toBeGreaterThanOrEqual(4.5);
  });
});

describe('the astronaut visor colours (VENT-10)', () => {
  // The pictures are baked offline with these tokens (scripts/astronaut-figures.mjs). They are declared once, outside
  // every theme, contrast and transparency query, so no theme can leave the visors stale. Moving one into a query would
  // need a sheet per theme.
  it.each(Object.values(VISOR_TOKENS))('%s is the same in every theme', (token) => {
    const declarations = TOKENS.split(`${token}:`).length - 1;
    expect(declarations).toBe(1);
    expect(TOKENS.indexOf(`${token}:`)).toBeLessThan(TOKENS.indexOf('@media'));
  });
});
