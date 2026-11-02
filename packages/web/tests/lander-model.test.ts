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
 * The lander of the on-foot view (VENT-46): which model a site gets, and
 * the maps the shipped glbs name (read by the small glb reader, never
 * GLTFLoader).
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { readGlb } from '../src/terrain/glb';
import { LANDER_RADIUS_M, landerKindOf } from '../src/terrain/lander-kind';

const load = (name: string) => {
  const file = readFileSync(new URL(`../models/${name}`, import.meta.url));
  return readGlb(file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength) as ArrayBuffer);
};

describe('which lander a site gets', () => {
  it('gives the Apollo LM to listed Apollo sites only', () => {
    expect(landerKindOf({ id: 'apollo11', group: 'apollo' })).toBe('apollo');
    expect(landerKindOf({ id: 'im2-athena', group: 'south_pole' })).toBe('generic');
    expect(landerKindOf({ id: 'x', group: 'other' })).toBe('generic');
    expect(landerKindOf({ id: 'x' })).toBe('generic');
  });

  it('gives a pin the generic lander even beside an Apollo site', () => {
    expect(landerKindOf({ id: '@-85.87,61.34', group: 'apollo' })).toBe('generic');
  });

  it('keeps the rocks clear of the footprint of each model', () => {
    expect(LANDER_RADIUS_M.apollo).toBeCloseTo(9.4 / 2, 1);
    expect(LANDER_RADIUS_M.generic).toBeGreaterThan(2);
  });
});

describe('the maps the shipped glbs name', () => {
  it('reads the generic lander: normal and occlusion on every material, clamped', () => {
    const { primitives } = load('lander.glb');
    expect(primitives).toHaveLength(6);
    for (const p of primitives) {
      expect(p.maps.normal?.uri).toBe('lander-normal.webp');
      expect(p.maps.occlusion?.uri).toBe('lander-ao.webp');
      expect(p.maps.normal?.clamp).toBe(true);
      expect(p.maps.map).toBeNull();
    }
  });

  it('reads the Apollo LM: foil maps through EXT_texture_webp, the booster colour, a normal strength', () => {
    const { primitives } = load('apollo-lm.glb');
    expect(primitives).toHaveLength(12);
    const uris = new Set(primitives.flatMap((p) => Object.values(p.maps).filter((m) => m).map((m) => m!.uri)));
    expect([...uris].sort()).toEqual(['apollo-lm-0.webp', 'apollo-lm-1.webp', 'apollo-lm-2.webp']);
    expect(primitives.some((p) => p.maps.map?.uri === 'apollo-lm-2.webp')).toBe(true);
    expect(primitives.some((p) => p.maps.metalRough?.uri === 'apollo-lm-1.webp')).toBe(true);
    expect(primitives.some((p) => Math.abs((p.maps.normal?.scale ?? 1) - 0.35) < 1e-6)).toBe(true);
    expect(primitives.every((p) => !p.maps.normal?.clamp)).toBe(true);
  });

  it('leaves the astronaut, which has no textures in its glb, with empty slots', () => {
    for (const p of load('astronaut.glb').primitives) {
      expect(p.maps).toEqual({ map: null, normal: null, occlusion: null, metalRough: null });
    }
  });
});
