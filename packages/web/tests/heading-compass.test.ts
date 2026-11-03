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
import { headingCompassName, headingMark, relativeAzimuth } from '../src/terrain/heading-compass';
import { homingOf, stepHoming } from '../src/terrain/look-home';
import { keyLook } from '../src/terrain/look-input';
import { viewAlt } from '../src/terrain/view-alt';
import { startLook, type Look } from '../src/terrain/view-camera';
import { EN, i18nOf } from './i18n-factories';

/** The Earth of the e2e point (api-stub.ts): 9.1° up at 314°. */
const EARTH = { id: 'earth', azDeg: 314, elDeg: 9.1, visible: true } as const;

describe('the relative azimuth', () => {
  it('is degrees clockwise from the heading, in (-180, 180]', () => {
    expect(relativeAzimuth(314, 339)).toBeCloseTo(-25, 9);
    expect(relativeAzimuth(10, 350)).toBeCloseTo(20, 9);
    expect(relativeAzimuth(190, 0)).toBeCloseTo(-170, 9);
    expect(relativeAzimuth(180, 0)).toBe(180);
    expect(relativeAzimuth(0, 180)).toBe(180);
    expect(relativeAzimuth(5, 5)).toBe(0);
  });
});

describe('the compass mark', () => {
  it('turns the rose against the heading, so its north points to true north', () => {
    expect(headingMark(0).roseDeg).toBe(0);
    expect(headingMark(120).roseDeg).toBeCloseTo(-120, 9);
    expect(headingMark(300).roseDeg).toBeCloseTo(60, 9);
  });

  it('puts the Earth at its azimuth relative to the heading, filled while the view sees it', () => {
    expect(headingMark(339, EARTH).earth).toEqual({ angleDeg: expect.closeTo(-25, 9), hidden: false });
    expect(headingMark(120, EARTH).earth?.angleDeg).toBeCloseTo(-166, 9);
  });

  it('draws the Earth hollow when the terrain or the horizon hides it', () => {
    expect(headingMark(339, { ...EARTH, visible: false }).earth?.hidden).toBe(true);
  });

  it('has no Earth mark before the bodies are known', () => {
    expect(headingMark(339).earth).toBeNull();
  });
});

describe('the compass name', () => {
  it('says the heading on eight points, where the Earth is and what a press does', () => {
    expect(headingCompassName(EN, 339, EARTH)).toBe(
      'View heading to the north. The Earth is to the north-west, above the terrain. Press to look back where the view opened.');
    expect(headingCompassName(EN, 120, { ...EARTH, visible: false })).toBe(
      'View heading to the south-east. The Earth is to the north-west, hidden by the terrain. Press to look back where the view opened.');
  });

  it('changes only when the heading moves to another octant', () => {
    const north = headingCompassName(EN, 0, EARTH);
    for (const yaw of [337.6, 350, 10, 22.4]) expect(headingCompassName(EN, yaw, EARTH)).toBe(north);
    expect(headingCompassName(EN, 22.6, EARTH)).not.toBe(north);
  });

  it('never contradicts the view’s text alternative', () => {
    for (const yaw of [0, 90, 200, 314]) {
      for (const visible of [true, false]) {
        const earth = { ...EARTH, visible };
        const name = headingCompassName(EN, yaw, earth);
        const sentence = /The Earth is [^.]+\./.exec(name)?.[0] ?? 'none';
        const alt = viewAlt(EN, { yawDeg: yaw, bodies: [{ ...earth, blocker: visible ? { kind: 'clear' } : { kind: 'far' } }] });
        expect(alt).toContain(sentence);
      }
    }
  });

  it('is the press alone, with the heading, before the bodies are known; in every language', () => {
    expect(headingCompassName(EN, 90)).toBe('View heading to the east. Press to look back where the view opened.');
    for (const locale of ['es', 'fr', 'de', 'it'] as const) {
      const name = headingCompassName(i18nOf(locale), 90, EARTH);
      expect(name).not.toMatch(/\{|onFoot\./);
    }
  });
});

/** Steps `homing` at 60 frames a second until it rests; the looks it went through. */
function settle(look: Look, home: Look): Look[] {
  let homing = homingOf(look, home);
  const seen: Look[] = [];
  for (let i = 0; homing && i < 600; i++) {
    const next = stepHoming(homing, 1 / 60);
    seen.push(next.look);
    homing = next.homing;
  }
  expect(homing).toBeNull();
  return seen;
}

describe('the way back to the opening heading', () => {
  const home = startLook(339);

  it('turns the short way round and lands exactly on the opening look', () => {
    const seen = settle({ yawDeg: 120, pitchDeg: 30 }, home);
    expect(seen.at(-1)).toEqual(home);
    // From 120° the short way to 339° is 141° to the left, through 60° and 0°, never through 200°.
    expect(seen.some((look) => look.yawDeg > 0 && look.yawDeg < 100)).toBe(true);
    expect(seen.every((look) => look.yawDeg < 150 || look.yawDeg > 300)).toBe(true);
  });

  it('never overshoots: a critically damped spring', () => {
    const seen = settle({ yawDeg: 300, pitchDeg: -20 }, home);
    const yaws = seen.map((look) => look.yawDeg);
    for (let i = 1; i < yaws.length; i++) expect(yaws[i]).toBeGreaterThanOrEqual(yaws[i - 1] ?? 0);
    expect(Math.max(...yaws)).toBeLessThanOrEqual(339);
    expect(seen.length).toBeLessThan(120);
  });

  it('has nothing to do when the view already looks where it opened', () => {
    expect(homingOf(home, home)).toBeNull();
  });

  it('is not the arrows’ business: Home goes to the scene, not to keyLook', () => {
    expect(keyLook(home, { key: 'Home', shiftKey: false })).toBeNull();
  });
});
