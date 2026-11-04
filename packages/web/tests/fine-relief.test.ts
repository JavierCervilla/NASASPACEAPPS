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
 * Preparing the fine relief of a view (VENT-62): only for a point inside a
 * tile, and never a failure of the view.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { prepareFine, viewOf } from '../src/terrain/fine/fine-relief';
import { frameAt } from '../src/terrain/ring/ring-frame';

const IM2 = { lat: -84.79, lonEast: 29.2 };
const disk = async (url: string): Promise<Response> => new Response(readFileSync(
  new URL(`../public/fine-tiles/${url.replace('/b/fine-tiles/', '')}`, import.meta.url)));

describe('prepareFine', () => {
  it('asks for nothing at a point outside every tile', async () => {
    const asked: string[] = [];
    const fetcher = (u: string) => (asked.push(u), disk(u));
    expect(await prepareFine({ lat: -85.5, lonEast: 40 }, { fetch: fetcher, base: '/b/' })).toBeNull();
    expect(asked).toEqual([]);
  });

  it('gives IM-2 its NAC tile, with slopes and the site\'s place in it', async () => {
    const relief = await prepareFine(IM2, { fetch: disk, base: '/b/' });
    expect(relief?.grid.site.folder).toBe('mons-mouton');
    const view = viewOf(relief!, frameAt(IM2, 5300));
    expect(view.texels).toHaveLength(300 * 300 * 4);
    expect(view.affine.x0).toBeGreaterThan(76360);
    expect(view.site.kind).toBe('nac');
  });

  it('is null when the tile cannot be had', async () => {
    const down = async () => new Response('', { status: 404 });
    expect(await prepareFine(IM2, { fetch: down, base: '/b/' })).toBeNull();
  });
});
