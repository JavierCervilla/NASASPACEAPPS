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

// The astronaut's sprite sheet (VENT-10), baked offline by scripts/astronaut-figures.mjs: its manifest, the file it
// names, the colours it was baked with and the CSS that picks a cell must all agree, or the figure would show the
// wrong pose or visor. Re-baking is `node packages/web/scripts/astronaut-figures.mjs`; `--check` proves the bytes.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { PICTURE, POSES, VISORS, VISOR_TOKENS } from '../src/astronaut/figure-types';

const read = (path: string): Buffer => readFileSync(new URL(path, import.meta.url));
const MANIFEST = JSON.parse(read('../src/astronaut/figures.json').toString('utf8')) as {
  file: string;
  width: number;
  height: number;
  cell: typeof PICTURE;
  rows: string[];
  columns: string[];
  colours: Record<string, string>;
  bytes: number;
  sha256: string;
};
const TOKENS = read('../src/styles/tokens.css').toString('utf8');
const CSS = read('../src/styles/astronaut.css').toString('utf8');

/** The size a VP8L (lossless WebP) file declares in its header. */
function webpSize(bytes: Buffer): { width: number; height: number; lossless: boolean } {
  const lossless = bytes.toString('ascii', 12, 16) === 'VP8L';
  const bits = bytes.readUInt32LE(21);
  return { width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1, lossless };
}

describe('the astronaut sprite sheet (VENT-10)', () => {
  it('is laid out as the page reads it: rows are the poses, columns the visors, cells the picture', () => {
    expect(MANIFEST.rows).toEqual(POSES);
    expect(MANIFEST.columns).toEqual(VISORS);
    expect(MANIFEST.cell).toEqual(PICTURE);
    expect(MANIFEST.width).toBe(PICTURE.width * VISORS.length);
    expect(MANIFEST.height).toBe(PICTURE.height * POSES.length);
  });

  it('is the file the manifest names, lossless and of the size it says', () => {
    const sheet = read(`../src/astronaut/${MANIFEST.file}`);
    expect(sheet.byteLength).toBe(MANIFEST.bytes);
    expect(createHash('sha256').update(sheet).digest('hex')).toBe(MANIFEST.sha256);
    expect(webpSize(sheet)).toEqual({ width: MANIFEST.width, height: MANIFEST.height, lossless: true });
  });

  it.each(Object.entries(VISOR_TOKENS))('was baked with the %s visor in %s as tokens.css sets it', (state, token) => {
    const value = new RegExp(`${token}:\\s*(#[0-9a-f]{6})\\s*;`, 'i').exec(TOKENS)?.[1]?.toLowerCase();
    expect(MANIFEST.colours[state]).toBe(value);
  });

  it('is picked cell by cell in the CSS: 500 % x 200 %, a quarter per column and the carry row below', () => {
    expect(CSS).toContain(`url('../astronaut/${MANIFEST.file}')`);
    expect(CSS).toContain(`background-size: ${VISORS.length * 100}% ${POSES.length * 100}%;`);
    expect(CSS).toContain(".astro-figure[data-pose='carry'] { --cell-y: 100%; }");
    VISORS.slice(1).forEach((visor, i) => {
      const x = ((i + 1) * 100) / (VISORS.length - 1);
      expect(CSS).toContain(`.astro-figure[data-visor='${visor}'] { --cell-x: ${x}%; }`);
    });
  });
});
