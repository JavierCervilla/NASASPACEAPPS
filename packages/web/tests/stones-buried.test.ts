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
 * A rock that is partly buried and lumpy (VENT-62): `lift` sets how high
 * its centre stands over the ground, `rough` how far its surface wanders.
 */
import { describe, expect, it } from 'vitest';
import type { Rock } from '../src/terrain/rocks';
import { stonesBuffers } from '../src/terrain/stones';

const ROCK: Rock = { east: 5, north: 3, radius: 0.2, squash: 0.5, yawRad: 0.4 };
const GROUND = () => 2;
const ys = (rock: Rock): number[] => {
  const p = stonesBuffers([rock], GROUND).positions;
  return Array.from({ length: p.length / 3 }, (_, i) => p[i * 3 + 1] ?? 0);
};
const mid = (a: number[]): number => (Math.max(...a) + Math.min(...a)) / 2;

describe('stonesBuffers', () => {
  it('sinks a rock a little by default, as before', () => {
    expect(mid(ys(ROCK))).toBeCloseTo(2 + 0.2 * 0.5 * 0.35, 6);
  });

  it('rests a rock of lift 1 on the ground and centres one of lift 0 in it', () => {
    const half = ROCK.radius * ROCK.squash;
    expect(Math.min(...ys({ ...ROCK, lift: 1 }))).toBeCloseTo(2, 6);
    expect(mid(ys({ ...ROCK, lift: 0 }))).toBeCloseTo(2, 6);
    expect(Math.max(...ys({ ...ROCK, lift: 0 }))).toBeCloseTo(2 + half, 6);
  });

  it('makes a rough rock lumpy, the same every time', () => {
    const round = stonesBuffers([ROCK], GROUND).positions;
    const lumpy = stonesBuffers([{ ...ROCK, rough: 0.4 }], GROUND).positions;
    expect(lumpy).not.toEqual(round);
    expect(stonesBuffers([{ ...ROCK, rough: 0.4 }], GROUND).positions).toEqual(lumpy);
  });
});
