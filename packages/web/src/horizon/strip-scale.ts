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
 * degrees per pixel up. The stretch is the site's: it follows from its
 * profile alone, never from the instant or where the Sun and the Earth
 * stand (a body past the scale is pinned to its edge instead), so it
 * holds while the time is scrubbed and across the usual strip widths.
 * Pure.
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

/**
 * The widest strip, width over height, a site's stretch is chosen for:
 * the desktop card's (about 6.3) and the phone sheet's up to 430 px
 * (about 7.1) are narrower, so they keep it and get more sky; a wider
 * strip lowers it until the terrain fits.
 */
const REF_ASPECT = 8;
/** Room above and below the terrain: a share of its span, plus. */
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

/**
 * The elevations the strip must hold for `profile`, degrees: the level
 * and the terrain (the smooth sphere's ±1° without one), padded.
 */
function terrainRange(profile?: HorizonProfile): [number, number] {
  let [lo, hi] = [-SMOOTH_SPAN_DEG, SMOOTH_SPAN_DEG];
  if (profile) {
    [lo, hi] = [0, 0];
    for (const value of profile.centiDeg) {
      lo = Math.min(lo, value / CENTIDEG_PER_DEG);
      hi = Math.max(hi, value / CENTIDEG_PER_DEG);
    }
  }
  const pad = (hi - lo) * PAD_SHARE + PAD_DEG;
  return [lo - pad, hi + pad];
}

/** `ex` rounded down: whole from 2 up, to a tenth under it. */
function roundDown(ex: number): number {
  return ex >= 2 ? Math.floor(ex) : Math.max(0.1, Math.floor(ex * 10) / 10);
}

/**
 * The scale of a `width` x `height` strip for `profile` (undefined: the
 * smooth sphere): the bottom just under the terrain, the stretch the
 * site's, and whatever height is left over given to the sky.
 */
export function stripScale(
  profile: HorizonProfile | undefined,
  width: number,
  height: number,
): StripScale {
  const [lo, top] = terrainRange(profile);
  const site = roundDown(360 / (REF_ASPECT * (top - lo)));
  if (width <= 0 || height <= 0) {
    return { width, height, lo, hi: top, exaggeration: site };
  }
  const degPerPxAcross = 360 / width;
  const fits = degPerPxAcross / ((top - lo) / height);
  const exaggeration = fits < site ? roundDown(fits) : site;
  const hi = lo + (degPerPxAcross * height) / exaggeration;
  return { width, height, lo, hi, exaggeration };
}
