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
 * How much of a fine tile's relief each pixel shows (VENT-62), after the
 * technique of Mooner's `fine-feather.ts`: none where the 1-bit mask says
 * the fine source has no height (LOLA's 20 m there) or off the tile, rising
 * with a smoothstep over {@link FEATHER_PX} pixels from there. The distance
 * is a two-pass 3-4 chamfer, a diagonal step costing about √2. Pure.
 */

/** The ramp from an uncovered pixel, fine pixels (5 m each). */
export const FEATHER_PX = 16;
const STRAIGHT = 3;
const DIAGONAL = 4;

const smooth = (t: number): number => {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
};

/** One chamfer step at (x, y) looking back by `s` (1 forward, -1 reverse). */
function relax(
  d: Float32Array,
  size: readonly [number, number],
  at: readonly [number, number],
  s: number,
): void {
  const [width, height] = size;
  const [x, y] = at;
  const get = (px: number, py: number): number =>
    px < 0 || py < 0 || px >= width || py >= height
      ? 0 : d[py * width + px] ?? 0;
  d[y * width + x] = Math.min(d[y * width + x] ?? 0,
    get(x - s, y) + STRAIGHT, get(x, y - s) + STRAIGHT,
    get(x - s, y - s) + DIAGONAL, get(x + s, y - s) + DIAGONAL);
}

/** Chamfer distance, in pixels, to the nearest uncovered one or the edge. */
export function chamferPx(
  mask: ArrayLike<number>,
  width: number,
  height: number,
): Float32Array {
  const far = 3 * (width + height);
  const d = new Float32Array(width * height);
  for (let i = 0; i < d.length; i++) d[i] = mask[i] ? far : 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      relax(d, [width, height], [x, y], 1);
    }
  }
  for (let y = height - 1; y >= 0; y--) {
    for (let x = width - 1; x >= 0; x--) {
      relax(d, [width, height], [x, y], -1);
    }
  }
  return d.map((thirds) => thirds / STRAIGHT);
}

/** The weight of each pixel, 0 to 255, row-major as the mask. */
export function featherWeights(
  mask: ArrayLike<number>,
  width: number,
  height: number,
): Uint8Array {
  const d = chamferPx(mask, width, height);
  return Uint8Array.from(d,
    (px) => Math.round(255 * smooth((px - 1) / FEATHER_PX)));
}
