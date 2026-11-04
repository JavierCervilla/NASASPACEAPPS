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
 * The clod raster packed for the GPU (VENT-67): R and G the slope along x
 * and z over ±SLOPE_RANGE, B the height from -CLOD_PIT to CLOD_HMAX - CLOD_PIT
 * metres. Pure.
 */
import { CLOD_TEXELS, CLOD_TEXEL_M } from './clod-law';

/** B encodes heights from -PIT to HMAX - PIT metres. */
export const CLOD_HMAX = 0.03;
export const CLOD_PIT = 0.006;
/** R and G encode slopes (rise over run) from -RANGE to +RANGE. */
export const SLOPE_RANGE = 2;

const byte = (v: number): number =>
  Math.round(255 * Math.min(1, Math.max(0, v)));

/** Packs the rows of `h` (from, to exclusive) into `out`, RGBA. */
export function packClods(
  h: Float32Array,
  out: Uint8Array,
  rows: readonly [number, number],
): void {
  const n = CLOD_TEXELS;
  const at = (x: number, y: number): number =>
    h[((y + n) % n) * n + ((x + n) % n)] ?? 0;
  for (let y = rows[0]; y < rows[1]; y++) {
    for (let x = 0; x < n; x++) {
      const sx = (at(x + 1, y) - at(x - 1, y)) / (2 * CLOD_TEXEL_M);
      const sz = (at(x, y + 1) - at(x, y - 1)) / (2 * CLOD_TEXEL_M);
      const o = (y * n + x) * 4;
      out[o] = byte(0.5 + sx / (2 * SLOPE_RANGE));
      out[o + 1] = byte(0.5 + sz / (2 * SLOPE_RANGE));
      out[o + 2] = byte((at(x, y) + CLOD_PIT) / CLOD_HMAX);
      out[o + 3] = 255;
    }
  }
}
