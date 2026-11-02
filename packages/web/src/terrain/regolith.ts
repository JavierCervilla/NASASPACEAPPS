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
 * The illustrative regolith grain (VENT-34): a tileable normal map and a
 * roughness map from seeded value noise, finer than LOLA can see, laid
 * over the measured relief. The caption says it is illustrative. Pure.
 */
import { generator } from './seeded';

export interface RegolithMaps {
  readonly size: number;
  /** RGBA, the tangent-space normal in RGB. */
  readonly normal: Uint8Array;
  /** RGBA, the roughness in G (Three.js reads it there). */
  readonly roughness: Uint8Array;
}

/**
 * Fine and soft: no octave coarser than a handful of centimetres at the
 * ground's scale, so it reads as dust and never as a pattern (a coarse
 * octave read as camouflage), and a weak bump and a faint albedo grain.
 */
const OCTAVES: readonly (readonly [number, number])[] =
  [[48, 0.4], [96, 0.35], [192, 0.25]];
const BUMP_STRENGTH = 1.6;
/** The albedo grain: near-white, a few percent either way (of 255). */
const GRAIN_MEAN = 236;
const GRAIN_SPREAD = 15;

/** A `size` x `size` height field of wrapping value noise. */
function grain(seed: number, size: number): Float32Array {
  const out = new Float32Array(size * size);
  const next = generator(seed);
  for (const [cells, weight] of OCTAVES) {
    const lattice = Float32Array.from({ length: cells * cells }, next);
    const at = (x: number, y: number): number =>
      lattice[(y % cells) * cells + (x % cells)] ?? 0;
    for (let i = 0; i < size * size; i++) {
      const fx = ((i % size) / size) * cells;
      const fy = (Math.floor(i / size) / size) * cells;
      const [x, y] = [Math.floor(fx), Math.floor(fy)];
      const [u, v] = [fx - x, fy - y];
      const top = at(x, y) * (1 - u) + at(x + 1, y) * u;
      const low = at(x, y + 1) * (1 - u) + at(x + 1, y + 1) * u;
      out[i] = (out[i] ?? 0) + (top * (1 - v) + low * v) * weight;
    }
  }
  return out;
}

/** The maps of `seed`, wrapping at their edges. */
export function regolithMaps(seed: number, size: number): RegolithMaps {
  const h = grain(seed, size);
  const normal = new Uint8Array(size * size * 4);
  const roughness = new Uint8Array(size * size * 4);
  const at = (x: number, y: number): number =>
    h[((y + size) % size) * size + ((x + size) % size)] ?? 0;
  const strength = BUMP_STRENGTH;
  for (let i = 0; i < size * size; i++) {
    const [x, y] = [i % size, Math.floor(i / size)];
    const dx = (at(x + 1, y) - at(x - 1, y)) * strength;
    const dy = (at(x, y + 1) - at(x, y - 1)) * strength;
    const len = Math.hypot(dx, dy, 1);
    const bytes = [-dx / len, -dy / len, 1 / len].map((c) => (c + 1) * 127.5);
    normal.set([...bytes, 255], i * 4);
    const rough = GRAIN_MEAN + (at(x, y) - 0.5) * GRAIN_SPREAD * 2;
    roughness.set([rough, rough, rough, 255], i * 4);
  }
  return { size, normal, roughness };
}
