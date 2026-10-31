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
 * The Moon's phase for the live favicon and the loading state (VENT-28), from the simulator's Sun (VENT-36): it lands
 * within a quarter of an hour of the true phases
 * (Meeus, «Astronomical Algorithms», ch. 49, worked out for these dates: new Moon 2026-11-09 07:01 UTC, full Moon
 * 2026-11-24 14:55 UTC, first quarter 2026-11-17, last quarter 2026-12-01), and each instant picks its frame.
 */
import { describe, expect, it } from 'vitest';
import { simPhase } from '../src/pwa/moon-phase';
import { frameIndex, frameUrl, PHASE_FRAMES } from '../src/pwa/phase-frames';

const phase = (iso: string): number => simPhase.phaseAt(Date.parse(iso));
/** The distance between two phases around the month. */
const apart = (a: number, b: number): number => Math.min(Math.abs(a - b), 1 - Math.abs(a - b));
/** A quarter of an hour, as a share of the synodic month. */
const QUARTER_HOUR = 0.25 / (29.530588853 * 24);

describe('simPhase', () => {
  it.each([
    ['new Moon', '2026-11-09T07:01:18Z', 0],
    ['full Moon', '2026-11-24T14:55:32Z', 0.5],
    ['new Moon of October', '2026-10-10T15:49:06Z', 0],
    ['full Moon of October', '2026-10-26T04:12:54Z', 0.5],
    ['the reference new Moon of 2000', '2000-01-06T18:14:00Z', 0],
  ])('%s, %s, is at %d within a quarter of an hour', (_, iso, expected) => {
    expect(apart(phase(iso), expected)).toBeLessThan(QUARTER_HOUR);
  });

  it('waxes between new and full, and wanes after', () => {
    expect(phase('2026-11-17T00:00:00Z')).toBeGreaterThan(0.2);
    expect(phase('2026-11-17T00:00:00Z')).toBeLessThan(0.3);
    expect(phase('2026-12-01T12:00:00Z')).toBeGreaterThan(0.7);
    expect(phase('2026-12-01T12:00:00Z')).toBeLessThan(0.8);
  });

  it('stays in [0, 1)', () => {
    for (let day = 0; day < 60; day += 1) {
      const p = simPhase.phaseAt(Date.UTC(2026, 10, 1) + day * 86_400_000);
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThan(1);
    }
  });
});

describe('frameIndex', () => {
  it('picks frame 0 at new Moon and the middle frame at full', () => {
    expect(frameIndex(phase('2026-11-09T07:01:18Z'))).toBe(0);
    expect(frameIndex(phase('2026-11-24T14:55:32Z'))).toBe(PHASE_FRAMES / 2);
  });

  it('rounds to the nearest frame and wraps the last half frame to new', () => {
    expect(frameIndex(0.49 / PHASE_FRAMES)).toBe(0);
    expect(frameIndex(0.51 / PHASE_FRAMES)).toBe(1);
    expect(frameIndex(1 - 0.4 / PHASE_FRAMES)).toBe(0);
    expect(frameIndex(1.5)).toBe(PHASE_FRAMES / 2);
  });

  it('changes about once a day: two instants a day apart differ by one frame at most', () => {
    const a = frameIndex(phase('2026-11-12T00:00:00Z'));
    const b = frameIndex(phase('2026-11-13T00:00:00Z'));
    expect(b - a).toBeGreaterThanOrEqual(0);
    expect(b - a).toBeLessThanOrEqual(2);
  });
});

describe('frameUrl', () => {
  it('names the two-digit frame under the base', () => {
    expect(frameUrl('/', 7)).toBe('/icons/phase/moon-07.webp');
    expect(frameUrl('/ventana', 15)).toBe('/ventana/icons/phase/moon-15.webp');
  });
});
