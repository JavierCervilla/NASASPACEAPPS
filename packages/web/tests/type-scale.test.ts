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
 * Typography (VENT-55, findings C-11 and C-24 of VENT-53; apple-design §15): tracking is size-specific, so it lives
 * with each size in one type scale and never on a container, where every size under it would inherit one value; and
 * text follows the user's text size with 11 px as its floor.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { allStyleSheets, declared, rootToken, rulesOf } from './css-rules';

const STEPS = ['caption', 'footnote', 'subhead', 'body', 'headline', 'title', 'display'];
const em = (value: string): number => Number(value.replace(/em$/, ''));
const rem = (value: string): number => Number(value.replace(/rem$/, ''));
const PAGE = readFileSync(new URL('../src/components/Page.astro', import.meta.url), 'utf8');
const RULES = [...Object.entries(allStyleSheets()), ['Page.astro', PAGE.slice(PAGE.indexOf('<style>'))] as const]
  .flatMap(([file, css]) => rulesOf(css).map((rule) => ({ file, ...rule })));

describe('the type scale', () => {
  const scaleOf = () => STEPS.map((step) => ({
    size: rem(rootToken(`--type-${step}-size`, [])),
    leading: Number(rootToken(`--type-${step}-leading`, [])),
    tracking: em(rootToken(`--type-${step}-tracking`, [])),
  }));

  it('grows step by step, in rem so it follows the text size', () => {
    const scale = scaleOf();
    scale.slice(1).forEach((step, i) => expect(step.size).toBeGreaterThan(scale[i]?.size ?? 0));
    expect(scale[0]?.size).toBeGreaterThanOrEqual(0.6875);
  });

  it('tightens tracking and leading as the size grows: small text positive, large negative', () => {
    const scale = scaleOf();
    scale.slice(1).forEach((step, i) => {
      expect(step.tracking).toBeLessThanOrEqual(scale[i]?.tracking ?? 0);
      expect(step.leading).toBeLessThanOrEqual(scale[i]?.leading ?? 0);
    });
    expect(scale[0]?.tracking).toBeGreaterThan(0);
    expect(scale.at(-1)?.tracking).toBeLessThan(0);
  });
});

describe('no container sets one tracking for every size under it (C-11)', () => {
  it.each(['.phone', '.site-card', '.strip'])('%s', (container) => {
    const rules = RULES.filter((rule) => rule.selector === container);
    expect(rules.length).toBeGreaterThan(0);
    for (const rule of rules) expect(declared(rule.body, 'letter-spacing')).toBeUndefined();
  });
});

/**
 * Text that keeps a px size, and why: its box is drawn in px around it, so a larger text size would break it. Both
 * still reach the 11 px floor.
 */
const FIXED_PX: Readonly<Record<string, string>> = {
  '.compass__n': 'the north letter of the 48 px compass button, set over its needle',
  '.polar-badge': 'the 16 px number badge, whose box src/polar/badge-layout.ts places around the markers',
};
/** Text under 11 px, and why: VENT-44 fits the five tab labels on one 360 px bar in the pseudo-locale. */
const UNDER_FLOOR: Readonly<Record<string, string>> = { '.tab': 'the phone tab bar under 400 px' };

/** The smallest size a font-size value gives at the default text size, in px. */
function smallestPx(value: string): number {
  const sizes = [...value.matchAll(/([\d.]+)(px|rem)/g)].map(([, n, unit]) => Number(n) * (unit === 'rem' ? 16 : 1));
  return Math.min(...sizes);
}

describe('text follows the text size, with an 11 px floor (C-24)', () => {
  const sized = RULES.map((rule) => ({ ...rule, size: declared(rule.body, 'font-size') ?? '' }))
    .filter((rule) => /\d(px|rem)/.test(rule.size) && !rule.size.startsWith('var('));
  it.each(sized.map((rule) => [`${rule.file} ${rule.selector}`, rule]))('%s', (_, rule) => {
    if (/^[\d.]+px$/.test(rule.size)) expect(Object.keys(FIXED_PX)).toContain(rule.selector);
    if (!(rule.selector in UNDER_FLOOR)) expect(smallestPx(rule.size)).toBeGreaterThanOrEqual(11);
  });
});
