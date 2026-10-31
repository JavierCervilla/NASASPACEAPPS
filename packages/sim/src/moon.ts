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
 * The Moon's geocentric position, Meeus «Astronomical Algorithms» (2nd ed.),
 * chapter 47, with the periodic terms truncated at 0.001° (`moon-terms.ts`).
 * Referred to the mean equinox of date; nutation (under 0.005°), aberration
 * and light-time are neglected.
 */
import { LAT_TERMS, LON_DIST_TERMS } from './moon-terms.ts';

const DEG = Math.PI / 180;
const J2000_JD = 2_451_545;
const UNIX_EPOCH_JD = 2_440_587.5;
const DAY_MS = 86_400_000;
/** TT - UTC since 2017: 37 leap seconds + 32.184 s (0.01° of Moon motion). */
const TT_MINUS_UTC_MS = 69_184;

/** The Moon seen from the Earth's centre at one instant. */
export interface MoonPosition {
  /** Ecliptic longitude, degrees, mean equinox of date. */
  readonly lonDeg: number;
  /** Ecliptic latitude, degrees. */
  readonly latDeg: number;
  /** Distance between the centres of the Earth and the Moon, km. */
  readonly distanceKm: number;
  /** Mean argument of latitude F, degrees (for the libration). */
  readonly argLatDeg: number;
  /** Mean longitude of the ascending node Ω, degrees. */
  readonly nodeDeg: number;
  /** Julian centuries of TT since J2000.0. */
  readonly centuries: number;
}

interface Arguments {
  readonly d: number;
  readonly m: number;
  readonly mp: number;
  readonly f: number;
  /** Eccentricity factor of the Earth's orbit, E. */
  readonly e: number;
}

/** Julian centuries of TT since J2000.0 of a Unix time in ms (UTC). */
export function centuriesTT(ms: number): number {
  const jd = (ms + TT_MINUS_UTC_MS) / DAY_MS + UNIX_EPOCH_JD;
  return (jd - J2000_JD) / 36_525;
}

/** sin of one term's argument, scaled by E for each multiple of M. */
function termSin(args: Arguments, k: readonly number[], cos = false): number {
  const [d = 0, m = 0, mp = 0, f = 0] = k;
  const angle = (d * args.d + m * args.m + mp * args.mp + f * args.f) * DEG;
  const scale = args.e ** Math.abs(m);
  return scale * (cos ? Math.cos(angle) : Math.sin(angle));
}

/** Σl, Σr and Σb of tables 47.A and 47.B, without the additive terms. */
function periodicSums(args: Arguments): [number, number, number] {
  let sl = 0;
  let sr = 0;
  let sb = 0;
  for (const term of LON_DIST_TERMS) {
    sl += term[4] * termSin(args, term);
    sr += term[5] * termSin(args, term, true);
  }
  for (const term of LAT_TERMS) {
    sb += term[4] * termSin(args, term);
  }
  return [sl, sr, sb];
}

/** The fundamental arguments of chapter 47, degrees, T in centuries. */
function fundamentals(t: number): Arguments & { lp: number; node: number } {
  const t2 = t * t;
  return {
    lp: 218.316_447_7 + 481_267.881_234_21 * t - 0.001_578_6 * t2,
    d: 297.850_192_1 + 445_267.111_403_4 * t - 0.001_881_9 * t2,
    m: 357.529_109_2 + 35_999.050_290_9 * t - 0.000_153_6 * t2,
    mp: 134.963_396_4 + 477_198.867_505_5 * t + 0.008_741_4 * t2,
    f: 93.272_095 + 483_202.017_523_3 * t - 0.003_653_9 * t2,
    node: 125.044_547_9 - 1934.136_289_1 * t + 0.002_075_4 * t2,
    e: 1 - 0.002_516 * t - 0.000_007_4 * t2,
  };
}

/** The Moon's geocentric position at Unix time `ms` (UTC). */
export function moonPosition(ms: number): MoonPosition {
  const t = centuriesTT(ms);
  const a = fundamentals(t);
  const [sl, sr, sb] = periodicSums(a);
  const a1 = (119.75 + 131.849 * t) * DEG;
  const a2 = (53.09 + 479_264.29 * t) * DEG;
  const a3 = (313.45 + 481_266.484 * t) * DEG;
  const lp = a.lp * DEG;
  const f = a.f * DEG;
  const lon = sl + 3958 * Math.sin(a1) + 1962 * Math.sin(lp - f)
    + 318 * Math.sin(a2);
  const lat = sb - 2235 * Math.sin(lp) + 382 * Math.sin(a3)
    + 175 * Math.sin(a1 - f) + 175 * Math.sin(a1 + f)
    + 127 * Math.sin(lp - a.mp * DEG) - 115 * Math.sin(lp + a.mp * DEG);
  return {
    lonDeg: a.lp + lon / 1e6,
    latDeg: lat / 1e6,
    distanceKm: 385_000.56 + sr / 1000,
    argLatDeg: a.f,
    nodeDeg: a.node,
    centuries: t,
  };
}
