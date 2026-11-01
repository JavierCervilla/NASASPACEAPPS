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

import { hasSun, quantiseDeg, type HorizonProfile, type HourSample } from '@ventana/sim';
import { describe, expect, it } from 'vitest';
import shipped from '../../sim/data/horizons.json';
import { shadowedComputed, shadowedLoader, shadowsOf } from '../src/source/shadowed-hours';
import { shippedTerrain, type TerrainOf } from '../src/source/terrain-profiles';
import { hoursOf, upUntil } from './phone-factories';

const RANGE = { from: '2026-11-01T00:00:00Z', to: '2026-11-01T03:00:00Z' };
// Sun and Earth up for two hours, then both down.
const HOURS: HourSample[] = hoursOf(4, { sunEl: upUntil(2), earthEl: upUntil(2) });
const NO_SHADOW = shadowsOf([]);

/** A profile at `deg` in every azimuth. */
const wall = (deg: number): HorizonProfile => ({ centiDeg: new Int16Array(720).fill(quantiseDeg(deg)) });

describe('shippedTerrain', () => {
  it('knows every curated site of the shipped file, and nothing else', () => {
    const terrainOf = shippedTerrain();
    for (const id of shipped.points.flatMap((p) => p.ids)) expect(terrainOf(id)?.centiDeg.length).toBe(720);
    expect(terrainOf('apollo11')).toBeUndefined();
    expect(terrainOf('@-85.87,61.34')).toBeUndefined();
  });

  it('decodes a profile once and hands back the same one', () => {
    const terrainOf = shippedTerrain();
    expect(terrainOf('im2-athena')).toBe(terrainOf('im2-athena'));
  });
});

describe('shadowedComputed and shadowedLoader with the terrain', () => {
  const WALLED = wall(80);
  const terrainOf: TerrainOf = (id) => (id === 'walled' ? WALLED : undefined);

  it('hides a Sun behind the terrain in the computed hours, once per array', () => {
    const load = shadowedComputed(() => HOURS, NO_SHADOW, terrainOf);
    const hours = load('walled', RANGE) ?? [];
    expect(hours.map(hasSun)).toEqual([false, false, false, false]);
    expect(hours.map((h) => h.sunEl)).toEqual(HOURS.map((h) => h.sunEl));
    expect(load('walled', RANGE)).toBe(hours);
    expect(load('open', RANGE)).toBe(HOURS);
  });

  it("applies it to Horizons' hours alike", async () => {
    const load = shadowedLoader(() => Promise.resolve(HOURS), NO_SHADOW, terrainOf);
    expect((await load('walled', RANGE)).map(hasSun)).toEqual([false, false, false, false]);
  });

  it('applies a profile that arrives after the first ask', () => {
    const known = new Map<string, HorizonProfile>();
    const load = shadowedComputed(() => HOURS, NO_SHADOW, (id) => known.get(id));
    expect(load('@-85.5,31', RANGE)).toBe(HOURS);
    known.set('@-85.5,31', wall(80));
    expect((load('@-85.5,31', RANGE) ?? []).map(hasSun)).toEqual([false, false, false, false]);
  });
});
