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
 * The clod raster's two reads in GLSL (VENT-67): height and slope at a
 * ground point `p` (metres east, south), at a mip level. The second read is
 * 1.7 times larger and turned, so the field does not repeat at 0.8 m; the
 * heights add, the slopes are turned back to the ground's frame.
 */
import { CLOD_TILE_M } from '../clod-law';
import { CLOD_HMAX, CLOD_PIT, SLOPE_RANGE } from '../clod-pack';
import { glslFloat as g } from './glsl-float';

/** The second read: scale, turn (cos, sin) and offset; the first is 1x. */
export const SECOND = { k: 1.7, c: Math.cos(2.0), s: Math.sin(2.0),
  off: [0.57, 0.29] } as const;
export const FIRST = { c: Math.cos(0.4), s: Math.sin(0.4),
  off: [0.13, 0.71] } as const;

type Turn = { c: number; s: number; off: readonly number[] };

const uvOf = (t: Turn, m: number): string => {
  const [c, s] = [g(t.c), g(t.s)];
  return `vec2(${c} * p.x - ${s} * p.y, ${s} * p.x + ${c} * p.y) / ${g(m)} + vec2(${g(t.off[0]!)}, ${g(t.off[1]!)})`;
};

const turnBack = (t: Turn, v: string): string => {
  const [c, s] = [g(t.c), g(t.s)];
  return `vec2(${c} * ${v}.x + ${s} * ${v}.y, -${s} * ${v}.x + ${c} * ${v}.y)`;
};

/** `clodH` and `clodSlope`, with the sampler and its on-switch. */
export function readersGlsl(): string {
  const a = uvOf(FIRST, CLOD_TILE_M);
  const b = uvOf(SECOND, CLOD_TILE_M * SECOND.k);
  const lod2 = `max(lod - ${g(Math.log2(SECOND.k))}, 0.0)`;
  const unpack = `* 2.0 - 1.0) * ${g(SLOPE_RANGE)}`;
  return `
uniform sampler2D uClod;
uniform float uClodOn;
float clodH(vec2 p, float lod) {
  float a = textureLod(uClod, ${a}, lod).b;
  float b = textureLod(uClod, ${b}, ${lod2}).b;
  return (a * ${g(CLOD_HMAX)} - ${g(CLOD_PIT)}) + ${g(SECOND.k)} * (b * ${g(CLOD_HMAX)} - ${g(CLOD_PIT)});
}
vec2 clodSlope(vec2 p, float lod) {
  vec2 a = (textureLod(uClod, ${a}, lod).rg ${unpack};
  vec2 b = (textureLod(uClod, ${b}, ${lod2}).rg ${unpack};
  return ${turnBack(FIRST, 'a')} + ${turnBack(SECOND, 'b')};
}`;
}
