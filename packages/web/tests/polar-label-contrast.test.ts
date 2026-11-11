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
 * The polar map's edge labels (0°, 90° E, 180°, 90° W) sit beside the disk
 * on the dark polar panel (`--map-panel`). Once the globe's graticule rules
 * stopped overriding them (VENT-52), they took `--text-muted`, which the
 * light theme (gone since VENT-113) darkened: 2.9:1 on the dark panel.
 * Small text needs 4.5:1, with more contrast too.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { contrast } from './colour-math';

const read = (file: string) => readFileSync(new URL(`../src/styles/${file}`, import.meta.url), 'utf8');
const TOKENS = read('tokens.css');
const POLAR = read('polar.css');
const AA_SMALL_TEXT = 4.5;

/** The CSS blocks of tokens.css that set custom properties, by media query. */
const BLOCKS: Readonly<Record<string, RegExp>> = {
  dark: /^:root\s*\{([\s\S]*?)\n\}/m,
  darkMore: /@media \(prefers-contrast: more\) \{\s*:root \{([\s\S]*?)\n {2}\}/,
};

/** The value of `name` in a theme: its own block first, then what it builds on. */
function tokenIn(theme: string, name: string): string {
  const order: Record<string, string[]> = {
    dark: ['dark'], darkMore: ['darkMore', 'dark'],
  };
  for (const block of order[theme] ?? []) {
    const body = BLOCKS[block]?.exec(TOKENS)?.[1] ?? '';
    const found = new RegExp(`${name}:\\s*([^;]+);`).exec(body)?.[1];
    if (found) return found.trim();
  }
  throw new Error(`no ${name} in ${theme}`);
}

/** The colour the bare `.graticule-label` rule of polar.css gives the label. */
function labelColourVar(): string {
  const rule = /\n\.graticule-label \{([\s\S]*?)\}/.exec(POLAR)?.[1] ?? '';
  const name = /color:\s*var\((--[\w-]+)\)/.exec(rule)?.[1];
  if (!name) throw new Error('the polar label has no token colour');
  return name;
}

describe('the polar map\'s edge labels on the dark panel', () => {
  for (const theme of Object.keys(BLOCKS)) {
    it(`reach 4.5:1 in the ${theme} theme`, () => {
      const panel = tokenIn(theme, '--map-panel');
      const label = tokenIn(theme, labelColourVar());
      expect(contrast(label, panel)).toBeGreaterThanOrEqual(AA_SMALL_TEXT);
    });
  }
});
