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
 * The terrain's horizon around a point, ray-marched over LOLA's elevation
 * grids (VENT-40). From an observer `heightM` above the ground, rays go out
 * along great circles, one per azimuth bin, and stop at fixed distances; at
 * each stop the terrain's height is read from the first grid of the stop's
 * band that has it, and the highest elevation angle along the ray is the
 * horizon there. The geometry is exact on the reference sphere, so the
 * Moon's curvature lowers far terrain. Deterministic: fixed stops, fixed
 * order, no randomness, the result quantised to hundredths of a degree.
 * Pure: the grids come with their heights or an accessor to them.
 *
 * The method is the one of the realism study of 2026-11-01 (`horizon.py`):
 * 20 m grid to 6 km, 80 m to 150 km, 240 m to 200 km, checked against
 * NASA's AVGVISIB map (tests/terrain-validation.test.ts).
 */
import { demHeightAt, type DemGrid } from './dem-grid.ts';
import { unitVector, type Vec3 } from './horizon.ts';
import { quantiseDeg, type HorizonProfile } from './terrain-profile.ts';
import {
  horizontalDir,
  pointAlong,
  rayStops,
  type DemBand,
  type Stops,
} from './ray-stops.ts';

export type { DemBand } from './ray-stops.ts';

const DEG = Math.PI / 180;

/** Azimuth bins of a profile: 0.5° each, finer than the 0.53° Sun. */
export const HORIZON_BINS = 720;

/** Where the horizon is seen from. */
export interface Observer {
  readonly latDeg: number;
  readonly lonEastDeg: number;
  /** Eye height above the ground of the first grid covering the point. */
  readonly heightM: number;
}

export interface TerrainHorizon {
  readonly profile: HorizonProfile;
  /** The ground's height under the observer, metres above the sphere. */
  readonly groundM: number;
  /** The smallest share of a ray's stops that some grid covered, 0-1. */
  readonly coverage: number;
  /** How many stops each grid answered, by grid id. */
  readonly stopsByGrid: Readonly<Record<string, number>>;
}

/** The first grid of `grids` with a height at `p`, and that height. */
function heightFrom(
  grids: readonly DemGrid[],
  p: Vec3,
): { h: number; grid: DemGrid | null } {
  for (const grid of grids) {
    const h = demHeightAt(grid, p);
    if (!Number.isNaN(h)) return { h, grid };
  }
  return { h: Number.NaN, grid: null };
}

interface Ray {
  readonly up: Vec3;
  readonly dir: Vec3;
  /** Distance of the eye from the Moon's centre, metres. */
  readonly eyeR: number;
  readonly radiusM: number;
  readonly counts: Map<string, number>;
}

/** The highest elevation (degrees) along one ray, and its covered stops. */
function rayHorizon(
  bands: readonly DemBand[],
  stops: Stops,
  ray: Ray,
): { el: number; covered: number } {
  const { up, dir, eyeR, radiusM, counts } = ray;
  let best = Number.NEGATIVE_INFINITY;
  let covered = 0;
  for (let i = 0; i < stops.band.length; i++) {
    const c = stops.cos[i] as number;
    const s = stops.sin[i] as number;
    const p = pointAlong(up, dir, c, s);
    const band = bands[stops.band[i] as number] as DemBand;
    const { h, grid } = heightFrom(band.grids, p);
    if (!grid) continue;
    covered++;
    counts.set(grid.id, (counts.get(grid.id) ?? 0) + 1);
    const r = radiusM + h;
    best = Math.max(best, (r * c - eyeR) / (r * s));
  }
  return { el: covered > 0 ? Math.atan(best) / DEG : -90, covered };
}

/**
 * The terrain's horizon seen from `observer`, over `bands` ordered from
 * the nearest out, in `bins` azimuths (bin `i` at `i * 360 / bins`°).
 *
 * @throws RangeError when no grid of the first band covers the point.
 */
export function terrainHorizon(
  bands: readonly DemBand[],
  observer: Observer,
  bins = HORIZON_BINS,
): TerrainHorizon {
  const { latDeg, lonEastDeg, heightM } = observer;
  const up = unitVector(latDeg, lonEastDeg);
  const ground = heightFrom(bands[0]?.grids ?? [], up);
  if (!ground.grid) throw new RangeError('point outside the grids');
  const radiusM = ground.grid.radiusM;
  const stops = rayStops(bands, radiusM);
  const eyeR = radiusM + ground.h + heightM;
  const counts = new Map<string, number>();
  const centiDeg = new Int16Array(bins);
  let fewest = stops.band.length;
  for (let k = 0; k < bins; k++) {
    const dir = horizontalDir(latDeg, lonEastDeg, (k * 360) / bins);
    const ray = rayHorizon(bands, stops, { up, dir, eyeR, radiusM, counts });
    centiDeg[k] = quantiseDeg(ray.el);
    fewest = Math.min(fewest, ray.covered);
  }
  const coverage = fewest / Math.max(stops.band.length, 1);
  const stopsByGrid = Object.fromEntries([...counts].sort());
  return { profile: { centiDeg }, groundM: ground.h, coverage, stopsByGrid };
}
