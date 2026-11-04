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
 * One crater's shape and its stamp on a wrapped raster of heights (VENT-64).
 * Pure. The height is in units of the crater's own depth: -1 at the centre
 * and, for a fresh crater (d/D 0.2 and up, Pike 1977) a parabolic bowl with
 * a raised rim of 0.18 of its depth; for a degraded one a smooth cosine bowl
 * (the wall slope of a degraded bowl, π d/D, is 5 to 14° for the
 * Basilevsky classes B to C, bracketing the 8-13° the Apollo 15 captions
 * give Index crater) with a faint rim.
 */
import type { Crater } from './crater-law';

/** d/D at and over which a crater is fresh, and the range it fades in over. */
const FRESH_FROM = 0.1;
const FRESH_RANGE = 0.1;
/** Rim height over depth: degraded, and the extra of a fresh one. */
const RIM_DEGRADED = 0.08;
const RIM_FRESH_EXTRA = 0.1;
/** Rim width in radii, degraded and the narrowing of a fresh one. */
const RIM_WIDTH = 0.4;
const RIM_WIDTH_FRESH = 0.15;
/** Past this many radii a crater leaves no height. */
const REACH = 2;

/** The crater's height at `t` = r / R, in units of its depth. */
export function profile(t: number, dd: number): number {
  const fresh = Math.min(1, Math.max(0, (dd - FRESH_FROM) / FRESH_RANGE));
  const bowl = t < 1 ? -0.5 * (1 + Math.cos(Math.PI * t)) : 0;
  const parabola = t < 1 ? -(1 - t * t) : 0;
  const e = (t - 1) / (RIM_WIDTH - RIM_WIDTH_FRESH * fresh);
  const rim = (RIM_DEGRADED + RIM_FRESH_EXTRA * fresh) * Math.exp(-e * e);
  return bowl + fresh * (parabola - bowl) + rim;
}

const wrap = (v: number, n: number): number => ((v % n) + n) % n;

/** Adds `crater` to the wrapped square raster `h` of `n` texels a side. */
export function stampCrater(h: Float32Array, n: number, c: Crater): void {
  const r = c.diameter / 2;
  const reach = Math.ceil(REACH * r);
  const amplitude = c.diameter * c.dd;
  const [cx, cy] = [Math.floor(c.x), Math.floor(c.y)];
  for (let j = -reach; j <= reach; j++) {
    const row = wrap(cy + j, n) * n;
    for (let i = -reach; i <= reach; i++) {
      const t = Math.hypot(cx + i + 0.5 - c.x, cy + j + 0.5 - c.y) / r;
      if (t > REACH) continue;
      const at = row + wrap(cx + i, n);
      h[at] = (h[at] ?? 0) + amplitude * profile(t, c.dd);
    }
  }
}
