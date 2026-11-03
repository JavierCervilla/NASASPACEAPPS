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
 * The graticule's labels (VENT-50) must stay readable over the Moon: the
 * label's text on its chip, composited over the brightest Moon the globe
 * shows, reaches 4.5:1 (WCAG AA for small text). The canvas drew the chip at
 * 0.44 opacity with grey text; over a white crater wall that gives 1.2:1. The
 * human chose white text, so the chip's opacity in tokens.css is the least
 * that passes with it.
 */
import { readFileSync } from 'node:fs';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { SUN_INTENSITY } from '../src/globe/sun-light';
import { contrast, over } from './colour-math';

const TOKENS = readFileSync(new URL('../src/styles/tokens.css', import.meta.url), 'utf8');
const TEXTURES = new URL('../public/textures/', import.meta.url);
const AA_SMALL_TEXT = 4.5;

/**
 * The brightest texel, per channel, of each colour map the globe loads (1K and 2K at the start, 4K on zoom, 8K on the
 * high tier), measured with sharp's `stats()` on the shipped files: the LROC mosaic is stretched to the full range, so
 * the 2K, 4K and 8K maps hold pure white texels and the 1K map one of 255, 255, 251. `it` below measures them again,
 * so a new map fails here instead of going unread.
 */
const MAP_PEAKS: Readonly<Record<string, readonly [number, number, number]>> = {
  'moon-lroc-1k.jpg': [255, 255, 251],
  'moon-lroc-2k.jpg': [255, 255, 255],
  'moon-lroc-4k.jpg': [255, 255, 255],
  'moon-lroc-8k.jpg': [255, 255, 255],
};

/** The value of the custom property `name`, first declaration in tokens.css. */
function token(name: string): string {
  const found = new RegExp(`${name}:\\s*([^;]+);`).exec(TOKENS)?.[1];
  if (!found) throw new Error(`no token ${name}`);
  return found.trim();
}

/** The chip of the label tokens with its opacity replaced by `alpha`. */
const chipAt = (alpha: number): string => token('--graticule-label-chip').replace(/[\d.]+\)$/, `${alpha})`);

const toLinear = (c: number): number => (c / 255 <= 0.04045 ? c / 255 / 12.92 : ((c / 255 + 0.055) / 1.055) ** 2.4);
const toSrgb = (l: number): number => Math.round(255 * (l <= 0.0031308 ? 12.92 * l : 1.055 * l ** (1 / 2.4) - 0.055));

/**
 * The brightest colour the globe draws a map's texel in: the per-channel peak of the maps, lit head-on by the Sun.
 * The Lambert surface reflects the sunlight times its colour over π, so a texel faces the Sun at 3.2 / π = 1.02 of
 * its own linear value at the most (src/globe/sun-light.ts), clipped at 1. The night side and every oblique light are
 * darker, so this bounds the globe's own light on any place and instant.
 */
function brightestShown(): string {
  const lit = SUN_INTENSITY / Math.PI;
  const channels = [0, 1, 2].map((i) => Math.max(...Object.values(MAP_PEAKS).map((peak) => peak[i] ?? 0)));
  return `#${channels
    .map((peak) => Math.min(255, toSrgb(Math.min(1, toLinear(peak) * lit))).toString(16).padStart(2, '0'))
    .join('')}`;
}

describe('the graticule label over the brightest Moon', () => {
  it('rests on the maps\' real peaks: sharp measures what the fixture says, in every map the globe loads', async () => {
    for (const [file, peak] of Object.entries(MAP_PEAKS)) {
      const { channels } = await sharp(new URL(file, TEXTURES).pathname).stats();
      expect(channels.slice(0, 3).map((c) => c.max), file).toEqual([...peak]);
    }
  });

  it('draws that peak at most 2 % brighter than the map: white, as the maps hold white', () => {
    expect(SUN_INTENSITY / Math.PI).toBeCloseTo(1.0186, 3);
    expect(brightestShown()).toBe('#ffffff');
  });

  it('reaches 4.5:1 for the label\'s text on its chip', () => {
    const chip = over(token('--graticule-label-chip'), brightestShown());
    expect(contrast(token('--graticule-label'), chip)).toBeGreaterThanOrEqual(AA_SMALL_TEXT);
  });

  it('would not at the canvas\'s 0.44: the chip over a white texel is a mid grey', () => {
    const chip = over(chipAt(0.44), brightestShown());
    expect(contrast(token('--graticule-label'), chip)).toBeLessThan(AA_SMALL_TEXT);
  });

  it('is only as dense as it must be: a hundredth less opacity would fail', () => {
    const alpha = Number(/([\d.]+)\)$/.exec(token('--graticule-label-chip'))?.[1]);
    const lower = Math.round((alpha - 0.01) * 100) / 100;
    expect(contrast(token('--graticule-label'), over(chipAt(lower), brightestShown()))).toBeLessThan(AA_SMALL_TEXT);
  });
});

describe('the graticule\'s other tokens', () => {
  it('are the approved ones: a thin neutral grey, a white label, a pole cross, never a signal colour', () => {
    expect(token('--graticule-line')).toBe('#8e8e93');
    expect(token('--graticule-line-alpha')).toBe('0.4');
    expect(token('--graticule-label')).toBe('#ffffff');
    expect(token('--graticule-pole')).toBe('rgba(174, 174, 178, 0.75)');
    const signals = ['--signal-sun', '--signal-earth', '--signal-window', '--signal-none'].map(token);
    expect(signals).not.toContain(token('--graticule-line'));
    expect(signals).not.toContain(token('--graticule-label'));
  });
});
