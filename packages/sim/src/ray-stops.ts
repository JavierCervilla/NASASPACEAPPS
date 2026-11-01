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
 * The geometry of a terrain horizon's rays (VENT-40): where a ray stops
 * (bands of distance, each with its step and the grids that may answer in
 * it, finest first), which way it leaves, and where a stop lies. Pure.
 */
import type { DemGrid } from './dem-grid.ts';
import { unitVector, type Vec3 } from './horizon.ts';

const DEG = Math.PI / 180;

/**
 * A band of distance from the observer: from where the previous band
 * ends (or `stepM` for the first) up to, not including, `untilM`, a stop
 * every `stepM` metres. Each stop takes its height from the first of
 * `grids` that has one; with none, the stop is skipped.
 */
export interface DemBand {
  readonly untilM: number;
  readonly stepM: number;
  readonly grids: readonly DemGrid[];
}

/** Every stop of a ray: the cosine and sine of its angle, its band. */
export interface Stops {
  readonly cos: Float64Array;
  readonly sin: Float64Array;
  readonly band: Uint8Array;
}

/** The stops of a ray over `bands` on a sphere of `radiusM`. */
export function rayStops(
  bands: readonly DemBand[],
  radiusM: number,
): Stops {
  const angles: number[] = [];
  const index: number[] = [];
  let start = bands[0]?.stepM ?? 0;
  bands.forEach((band, b) => {
    for (let i = 0; start + i * band.stepM < band.untilM; i++) {
      angles.push((start + i * band.stepM) / radiusM);
      index.push(b);
    }
    start = band.untilM;
  });
  return {
    cos: Float64Array.from(angles, Math.cos),
    sin: Float64Array.from(angles, Math.sin),
    band: Uint8Array.from(index),
  };
}

/** The unit vector toward azimuth `azDeg` on a point's local horizon. */
export function horizontalDir(
  latDeg: number,
  lonDeg: number,
  azDeg: number,
): Vec3 {
  const east = unitVector(0, lonDeg + 90);
  const north = unitVector(latDeg + 90, lonDeg);
  const ca = Math.cos(azDeg * DEG);
  const sa = Math.sin(azDeg * DEG);
  return [
    ca * north[0] + sa * east[0],
    ca * north[1] + sa * east[1],
    ca * north[2] + sa * east[2],
  ];
}

/**
 * The unit vector of a stop at angle θ along a great circle from `up`
 * toward `dir`, given cos θ and sin θ.
 */
export function pointAlong(up: Vec3, dir: Vec3, c: number, s: number): Vec3 {
  return [
    c * up[0] + s * dir[0],
    c * up[1] + s * dir[1],
    c * up[2] + s * dir[2],
  ];
}
