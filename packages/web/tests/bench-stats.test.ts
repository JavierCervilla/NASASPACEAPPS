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

/** The benchmark's statistics (VENT-81): median, nearest-rank p95, worst, and a step's frame summary. */
import { describe, expect, it } from 'vitest';
import { frameStats, median, percentile } from '../src/bench/stats';

describe('median', () => {
  it('is the middle value, or the mean of the middle two, whatever the order', () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 3, 2])).toBe(2.5);
    expect(median([])).toBeNull();
  });
});

describe('percentile', () => {
  it('takes the nearest rank', () => {
    const values = Array.from({ length: 20 }, (_, i) => i + 1);
    expect(percentile(values, 95)).toBe(19);
    expect(percentile(values, 100)).toBe(20);
    expect(percentile(values, 0)).toBe(1);
    expect(percentile([], 95)).toBeNull();
  });
});

describe('frameStats', () => {
  it('gives the frame rate from the median interval, the p95 and the worst frame', () => {
    const intervals = [...Array.from({ length: 18 }, () => 16), 50, 400];
    expect(frameStats(intervals)).toEqual({ fps: 62.5, p95Ms: 50, worstMs: 400, drawn: 20 });
  });

  it('says nothing when no frame was drawn', () => {
    expect(frameStats([])).toEqual({ fps: null, p95Ms: null, worstMs: null, drawn: 0 });
  });
});
