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
 * When a new scene input is worth a frame (VENT-49): a new instant makes a
 * new sky, a new words object and a new bodies list every minute, none of
 * which change what is drawn, so the view compares what it draws, by value
 * where an object is new each time, and draws only for a change.
 */
import { describe, expect, it } from 'vitest';
import { drawsAgain } from '../src/terrain/input-change';
import type { SceneInput, SceneWords } from '../src/terrain/scene/scene-types';

const TILE = { tile: { sizeM: 4000 }, ys: new Float32Array(1) };
const RING = { near: TILE };
const WORDS: SceneWords = { rings: ['25 m', '100 m', '500 m'], ridge: { text: 'Ridge 120 m · 3 km', azDeg: 339, distanceM: 3000 } };

const input = (patch: Partial<SceneInput> = {}): SceneInput => ({
  tiles: [TILE], ring: RING, profile: null, seed: 7,
  sky: { sunAz: 339, sunEl: 5.7, earthAz: 314, earthEl: 9.1 }, earthSpin: [], mode: 'third', lander: 'generic',
  startYawDeg: 339, words: WORDS, ...patch,
}) as unknown as SceneInput;

describe('drawsAgain', () => {
  it('draws the first input', () => {
    expect(drawsAgain(null, input())).toBe(true);
  });

  it('does not draw an input that is the same, new objects and all', () => {
    const was = input();
    const next = input({ sky: { ...was.sky }, words: { rings: [...WORDS.rings], ridge: WORDS.ridge && { ...WORDS.ridge } }, earthSpin: [1] });
    expect(drawsAgain(was, next)).toBe(false);
  });

  it('does not draw for the minute of the live clock: a ridge label 0.008 degrees along', () => {
    const next = input({ words: { rings: WORDS.rings, ridge: WORDS.ridge && { ...WORDS.ridge, azDeg: 339.008 } } });
    expect(drawsAgain(input(), next)).toBe(false);
  });

  it('draws when a label says something else, appears or goes', () => {
    const was = input();
    expect(drawsAgain(was, input({ words: { rings: WORDS.rings, ridge: WORDS.ridge && { ...WORDS.ridge, text: 'Ridge 121 m · 3 km' } } }))).toBe(true);
    expect(drawsAgain(was, input({ words: { rings: WORDS.rings, ridge: null } }))).toBe(true);
    expect(drawsAgain(input({ words: { rings: WORDS.rings, ridge: null } }), was)).toBe(true);
    expect(drawsAgain(was, input({ words: { rings: ['25 m', '100 m', '500 mi'], ridge: WORDS.ridge } }))).toBe(true);
  });

  it('draws when the ridge moved 0.1 degrees or more along the sky', () => {
    const next = input({ words: { rings: WORDS.rings, ridge: WORDS.ridge && { ...WORDS.ridge, azDeg: 339.2 } } });
    expect(drawsAgain(input(), next)).toBe(true);
  });

  it('draws for a new ground, ring, profile, mode, lander or seed', () => {
    const was = input();
    expect(drawsAgain(was, input({ tiles: [{ ...TILE } as never] }))).toBe(true);
    expect(drawsAgain(was, input({ tiles: [] }))).toBe(true);
    expect(drawsAgain(was, input({ ring: { ...RING } as never }))).toBe(true);
    expect(drawsAgain(was, input({ profile: {} as never }))).toBe(true);
    expect(drawsAgain(was, input({ mode: 'first' }))).toBe(true);
    expect(drawsAgain(was, input({ lander: 'apollo' }))).toBe(true);
    expect(drawsAgain(was, input({ seed: 8 }))).toBe(true);
  });
});
