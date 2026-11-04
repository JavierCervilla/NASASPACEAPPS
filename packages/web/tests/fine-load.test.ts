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
 * Loading a fine tile (VENT-62): two requests, decoded to metres and
 * feather weights; a failure is a missing tile, never the view's failure.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { FINE_SITES } from '../src/terrain/fine/fine-catalog';
import { loadFine } from '../src/terrain/fine/fine-load';

const SITE = FINE_SITES[0]!;
const disk = async (url: string): Promise<Response> => {
  const file = url.replace('/base/fine-tiles/', '');
  return new Response(readFileSync(
    new URL(`../public/fine-tiles/${file}`, import.meta.url)));
};

describe('loadFine', () => {
  it('asks for the heights and the mask of the tile, nothing else', async () => {
    const asked: string[] = [];
    const fetcher = (url: string) => (asked.push(url), disk(url));
    await loadFine(SITE, { fetch: fetcher, base: '/base/' });
    expect(asked.sort()).toEqual(['/base/fine-tiles/mons-mouton/heights.png',
      '/base/fine-tiles/mons-mouton/mask.png']);
  });

  it('gives metres over the sphere and weights from 0 to 1', async () => {
    const grid = await loadFine(SITE, { fetch: disk, base: '/base/' });
    expect(grid?.size).toBe(300);
    const range = grid?.heights.reduce((r, h) => [Math.min(r[0]!, h),
      Math.max(r[1]!, h)], [Infinity, -Infinity]);
    expect(range?.[0]).toBeCloseTo(5275.17, 1);
    expect(range?.[1]).toBeCloseTo(5358.38, 1);
    expect(grid?.weights[0]).toBe(0);
    expect(grid?.weights[150 * 300 + 150]).toBe(1);
  });

  it('answers null when a request fails', async () => {
    const down = async () => new Response('', { status: 404 });
    expect(await loadFine(SITE, { fetch: down, base: '/' })).toBeNull();
  });

  it('lets the page breathe between its stages', async () => {
    let breaths = 0;
    await loadFine(SITE, { fetch: disk, base: '/base/',
      breathe: async () => void breaths++ });
    expect(breaths).toBeGreaterThanOrEqual(2);
  });
});
