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
 * The geometry of the horizon strip (VENT-40, canvas option B): all 360°
 * of azimuth across its width with north in the centre (S W N E S), and
 * the terrain's elevation up its height, stretched so the relief reads:
 * the stretch is the strip's «Height ×N», degrees per pixel across over
 * degrees per pixel up. Pure.
 */
import {
  CENTIDEG_PER_DEG,
  type HorizonProfile,
} from '@ventana/sim';

export interface StripScale {
  readonly width: number;
  readonly height: number;
  /** The elevations at the bottom and the top, degrees. */
  readonly lo: number;
  readonly hi: number;
  /** How much the heights are stretched against the azimuths. */
  readonly exaggeration: number;
}

/** The elevations a body may stretch the scale to, degrees. */
const BODY_REACH = { lo: -5, hi: 12 } as const;
/** Room above and below what is drawn: a share of the span, plus. */
const PAD_SHARE = 0.18;
const PAD_DEG = 0.2;
/** The smooth sphere's strip spans at least ±1°. */
const SMOOTH_SPAN_DEG = 1;

/** The x of azimuth `azDeg` (clockwise from north), north in the centre. */
export function xOfAz(azDeg: number, width: number): number {
  const fromSouth = ((((azDeg + 180) % 360) + 360) % 360) / 360;
  return fromSouth * width;
}

/** The y of elevation `elDeg` on `scale`, clamped inside the strip. */
export function yOfEl(scale: StripScale, elDeg: number): number {
  const share = (elDeg - scale.lo) / (scale.hi - scale.lo);
  return Math.min(scale.height, Math.max(0, scale.height * (1 - share)));
}

/** The lowest and highest bin of `profile`, degrees. */
function extremes(profile: HorizonProfile): [number, number] {
  let [lo, hi] = [Infinity, -Infinity];
  for (const value of profile.centiDeg) {
    lo = Math.min(lo, value);
    hi = Math.max(hi, value);
  }
  return [lo / CENTIDEG_PER_DEG, hi / CENTIDEG_PER_DEG];
}

/**
 * The scale of a `width` x `height` strip that holds the level (0°), the
 * terrain of `profile` (the smooth sphere's ±1° without one) and the
 * elevations of the bodies, as far as {@link BODY_REACH}.
 */
export function stripScale(
  profile: HorizonProfile | undefined,
  bodyEls: readonly number[],
  width: number,
  height: number,
): StripScale {
  const smooth: [number, number] = [-SMOOTH_SPAN_DEG, SMOOTH_SPAN_DEG];
  let [lo, hi] = profile ? extremes(profile) : smooth;
  [lo, hi] = [Math.min(lo, 0), Math.max(hi, 0)];
  for (const el of bodyEls) {
    const reach = Math.min(BODY_REACH.hi, Math.max(BODY_REACH.lo, el));
    [lo, hi] = [Math.min(lo, reach), Math.max(hi, reach)];
  }
  const pad = (hi - lo) * PAD_SHARE + PAD_DEG;
  [lo, hi] = [lo - pad, hi + pad];
  const exaggeration = (360 / width) / ((hi - lo) / height);
  return { width, height, lo, hi, exaggeration };
}

/**
 * The terrain's skyline from south to south through north, as SVG
 * points «x,y x,y …», one per bin and the first again at the end.
 */
export function skyline(profile: HorizonProfile, scale: StripScale): string {
  const values = profile.centiDeg;
  const n = values.length;
  const points: string[] = [];
  for (let k = 0; k <= n; k++) {
    const bin = (k + n / 2) % n;
    const el = (values[bin] ?? 0) / CENTIDEG_PER_DEG;
    const x = (k / n) * scale.width;
    points.push(`${x.toFixed(1)},${yOfEl(scale, el).toFixed(1)}`);
  }
  return points.join(' ');
}
