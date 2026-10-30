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

import { describe, expect, it } from 'vitest';
import {
  DSN_MIN_ELEVATION_DEG,
  EARTH_MIN_ELEVATION_DEG,
  SUN_MIN_ELEVATION_DEG,
  activeDsn,
  hasEarth,
  hasSun,
  isWindow,
} from '../src/visibility.ts';

describe('visibility thresholds', () => {
  it('pins the spec thresholds: Sun above 0 degrees, Earth above 3 degrees', () => {
    expect(SUN_MIN_ELEVATION_DEG).toBe(0);
    expect(EARTH_MIN_ELEVATION_DEG).toBe(3);
    expect(hasSun({ sunEl: -0.01 })).toBe(false);
    expect(hasEarth({ earthEl: 2.99 })).toBe(false);
  });

  it('needs the Sun strictly above 0 degrees', () => {
    expect(hasSun({ sunEl: SUN_MIN_ELEVATION_DEG })).toBe(false);
    expect(hasSun({ sunEl: 0.01 })).toBe(true);
  });

  it('needs the Earth strictly above 3 degrees', () => {
    expect(hasEarth({ earthEl: EARTH_MIN_ELEVATION_DEG })).toBe(false);
    expect(hasEarth({ earthEl: 3.01 })).toBe(true);
    expect(hasEarth({ earthEl: 2 })).toBe(false);
  });

  it('opens a window only with both', () => {
    expect(isWindow({ sunEl: 1, earthEl: 4 })).toBe(true);
    expect(isWindow({ sunEl: 1, earthEl: 2 })).toBe(false);
    expect(isWindow({ sunEl: -1, earthEl: 4 })).toBe(false);
  });
});

describe('activeDsn', () => {
  it('picks the complex that sees the Moon highest', () => {
    expect(activeDsn({ goldstone: 20, canberra: 45, madrid: 30 })).toBe('canberra');
  });

  it('ignores complexes at or below 10 degrees', () => {
    expect(activeDsn({ goldstone: DSN_MIN_ELEVATION_DEG, canberra: -5, madrid: 9.9 })).toBeNull();
    expect(activeDsn({ goldstone: 10.1, canberra: -5, madrid: 9.9 })).toBe('goldstone');
  });

  it('breaks a tie in favour of the first complex', () => {
    expect(activeDsn({ goldstone: 30, canberra: 30, madrid: 12 })).toBe('goldstone');
  });
});
