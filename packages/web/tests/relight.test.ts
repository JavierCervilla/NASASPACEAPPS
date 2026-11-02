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
 * When a new instant is worth lighting the on-foot view again (VENT-49):
 * only when the Sun or the Earth, seen from the point, moved at least 0.1
 * degrees since the last time. The live clock makes a new instant every
 * minute, for a Sun that moves 0.008 degrees in it, and each one re-shades
 * every ring and draws frames a phone's GPU can do without.
 */
import { describe, expect, it } from 'vitest';
import { decideRelight, needsRelight, RELIGHT_DEG, skyMove } from '../src/terrain/relight';
import type { SkyDirs } from '../src/terrain/scene/scene-types';

const BASE: SkyDirs = { sunAz: 339, sunEl: 5.7, earthAz: 314, earthEl: 9.1 };

/** `BASE` with the Sun's elevation and the Earth's elevation moved. */
const moved = (sunEl: number, earthEl = 0): SkyDirs =>
  ({ ...BASE, sunEl: BASE.sunEl + sunEl, earthEl: BASE.earthEl + earthEl });

describe('needsRelight', () => {
  it('lights the first state, whatever it is', () => {
    expect(needsRelight(null, BASE)).toBe(true);
  });

  it('does not light a state that did not move', () => {
    expect(needsRelight(BASE, { ...BASE })).toBe(false);
  });

  it('skips the minute of the live clock: the Sun moves 0.008 degrees', () => {
    expect(needsRelight(BASE, moved(0.008, 0.004))).toBe(false);
  });

  it('skips 0.05 degrees and lights 0.1 degrees of the Sun', () => {
    expect(needsRelight(BASE, moved(0.05))).toBe(false);
    expect(needsRelight(BASE, moved(RELIGHT_DEG))).toBe(true);
    expect(needsRelight(BASE, moved(-RELIGHT_DEG))).toBe(true);
  });

  it('lights when the Earth alone moved 0.1 degrees', () => {
    expect(needsRelight(BASE, moved(0, 0.05))).toBe(false);
    expect(needsRelight(BASE, moved(0, 0.1))).toBe(true);
  });

  it('measures on the sky, not in azimuth degrees: 0.1 degrees of azimuth at 60 degrees up is 0.05', () => {
    const high: SkyDirs = { ...BASE, sunEl: 60 };
    expect(needsRelight(high, { ...high, sunAz: high.sunAz + 0.1 })).toBe(false);
    expect(needsRelight(high, { ...high, sunAz: high.sunAz + 0.3 })).toBe(true);
  });

  it('reads the azimuth across north and past a whole turn', () => {
    const north: SkyDirs = { ...BASE, sunAz: 359.98, sunEl: 0 };
    expect(needsRelight(north, { ...north, sunAz: 0.01 })).toBe(false);
    expect(needsRelight(north, { ...north, sunAz: 0.2 })).toBe(true);
  });

  it('takes a larger threshold when given one', () => {
    expect(needsRelight(BASE, moved(0.5), 1)).toBe(false);
    expect(needsRelight(BASE, moved(1), 1)).toBe(true);
  });
});

describe('skyMove', () => {
  it('says how far each body moved, degrees', () => {
    const { sunDeg, earthDeg } = skyMove(BASE, moved(0.25, 0.5));
    expect(sunDeg).toBeCloseTo(0.25, 6);
    expect(earthDeg).toBeCloseTo(0.5, 6);
  });
});

describe('decideRelight', () => {
  it('lights the first state and says so', () => {
    expect(decideRelight(null, BASE, false)).toEqual({ relight: true, text: 'relight: first sky', repeat: 'relight' });
  });

  it('lights a new ground whatever the sky did, and says so', () => {
    expect(decideRelight(BASE, { ...BASE }, true)).toEqual({ relight: true, text: 'relight: new ground', repeat: 'relight' });
  });

  it('lights a move of 0.1 degrees and says how far each body went', () => {
    const { relight, text, repeat } = decideRelight(BASE, moved(0.5, 0.25), false);
    expect(relight).toBe(true);
    expect(repeat).toBe('relight');
    expect(text).toBe('relight: Sun moved 0.500 deg, Earth 0.250 deg');
  });

  it('skips the minute of the live clock and says so, folding with the next skip', () => {
    const { relight, text, repeat } = decideRelight(BASE, moved(0.008, 0.004), false);
    expect(relight).toBe(false);
    expect(repeat).toBe('skip');
    expect(text).toBe('instant skipped: Sun moved 0.008 deg, Earth 0.004 deg since the last relight');
  });
});
