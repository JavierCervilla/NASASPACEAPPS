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
import { contrast, over } from './colour-math';

const TOKENS = readFileSync(new URL('../src/styles/tokens.css', import.meta.url), 'utf8');
const PHONE = readFileSync(new URL('../src/styles/phone.css', import.meta.url), 'utf8');

/** The custom properties set in the first block that follows `marker` in `css`. */
function block(css: string, marker: string): Record<string, string> {
  const start = css.indexOf(marker);
  if (start === -1) throw new Error(`no block ${marker}`);
  const body = css.slice(start, css.indexOf('}', css.indexOf(':root', start)));
  return Object.fromEntries([...body.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2]?.trim()]));
}

/** A token's colour, following one `var(--x)` to the token it names. */
function resolved(tokens: Record<string, string>, value: string): string {
  const ref = /^var\((--[\w-]+)\)$/.exec(value)?.[1];
  return ref ? tokens[ref] ?? '' : value;
}

// VENT-113: the app is always dark, so the dark theme is the only one to hold.
describe('label contrast on the phone cards', () => {
  const dark = block(TOKENS, ':root {');
  const card = block(PHONE, ':root {')['--phone-card'] ?? '';

  it('reads the card as dark', () => {
    expect(card).toBe('#1f2027');
  });

  // 12 px labels are small text: WCAG AA asks 4.5:1.
  it.each(['--signal-window-ink', '--signal-sun-ink', '--signal-earth-ink', '--text-muted'])('%s reaches 4.5:1 on the card', (token) => {
    const colour = dark[token] ?? '';
    expect(colour).toMatch(/^#[0-9a-f]{6}$/i);
    expect(contrast(colour, card)).toBeGreaterThanOrEqual(4.5);
  });
});

describe('signal words on the phone top bar (VENT-33)', () => {
  const dark = block(TOKENS, ':root {');
  const phone = block(PHONE, ':root {');
  // The worst case: the bar's glass over the black sky at the screen's top, and the site pill's fill on it.
  const SKY = '#07080b';
  const bar = over(phone['--phone-bar'] ?? '', SKY);
  const pill = over(dark['--fill'] ?? '', bar);

  it.each(['--bar-sun-ink', '--bar-earth-ink', '--bar-window-ink'])('%s reaches 4.5:1 on the bar and in the pill', (token) => {
    const colour = resolved(dark, phone[token] ?? '');
    expect(colour).toMatch(/^#[0-9a-f]{6}$/i);
    expect(contrast(colour, bar)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(colour, pill)).toBeGreaterThanOrEqual(4.5);
  });

  it('keeps the rule\'s «+» and «=» and a plain state line, in the secondary text, at 4.5:1 in the pill', () => {
    expect(contrast(dark['--text-secondary'] ?? '', pill)).toBeGreaterThanOrEqual(4.5);
  });
});
