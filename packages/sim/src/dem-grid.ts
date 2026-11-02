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
 * An elevation grid as LOLA publishes them (VENT-40), read through an
 * accessor so the caller decides where the heights live: a whole array
 * in memory (tests, a small crop) or blocks read from disk on demand (the
 * server). Two projections, as the PDS labels define them:
 *
 * - polar stereographic, centred on a pole (LDEM_80S_20M, LDEM_80N_20M,
 *   the 80 m and 240 m caps): 0° E up on the south grids, down on the
 *   north ones, 90° E right on both;
 * - simple cylindrical (LDEM_128, the LDEM_256 and LDEM_512 tiles):
 *   line = LINE_PROJECTION_OFFSET - lat x MAP_RESOLUTION, sample =
 *   SAMPLE_PROJECTION_OFFSET + (lon - CENTER_LONGITUDE) x MAP_RESOLUTION.
 *
 * Lines and samples are 0-based, the labels' offsets used as given (the
 * first pixel's centre at 0). Height = DN x SCALING_FACTOR above a sphere
 * of A_AXIS_RADIUS. Pure.
 */
import type { Vec3 } from './horizon.ts';

const DEG = Math.PI / 180;

export interface PolarProjection {
  readonly kind: 'polar';
  readonly pole: 'south' | 'north';
  /** 0-based line and sample of the pole (the label's offsets). */
  readonly poleLine: number;
  readonly poleSample: number;
  /** MAP_SCALE, metres per pixel at the pole. */
  readonly metresPerPixel: number;
}

export interface CylindricalProjection {
  readonly kind: 'cylindrical';
  /** MAP_RESOLUTION, pixels per degree. */
  readonly pixelsPerDeg: number;
  readonly lineOffset: number;
  readonly sampleOffset: number;
  readonly centerLonDeg: number;
}

/** A grid of heights: its size, projection and an accessor to its DNs. */
export interface DemGrid {
  /** A name for reports, such as the product's id. */
  readonly id: string;
  readonly lines: number;
  readonly samples: number;
  readonly projection: PolarProjection | CylindricalProjection;
  /** SCALING_FACTOR, metres per DN. */
  readonly metresPerDn: number;
  /** A_AXIS_RADIUS, metres. */
  readonly radiusM: number;
  /** The DN at a pixel inside the grid; NaN when there is no height. */
  readonly dnAt: (line: number, sample: number) => number;
}

/**
 * The line and sample of a point given as a unit vector from the Moon's
 * centre (x to 0° E, y to 90° E, z north). On a polar grid the radius
 * 2R tan(45° ∓ lat / 2) times cos or sin of the longitude is 2R x / (1 ± z)
 * or 2R y / (1 ± z), which needs no trigonometry.
 */
export function pixelOf(grid: DemGrid, p: Vec3): [number, number] {
  const proj = grid.projection;
  if (proj.kind === 'polar') {
    const south = proj.pole === 'south';
    const k = (2 * grid.radiusM) / (1 + (south ? -p[2] : p[2]));
    const scale = k / proj.metresPerPixel;
    const dLine = south ? -scale * p[0] : scale * p[0];
    return [proj.poleLine + dLine, proj.poleSample + scale * p[1]];
  }
  const lat = Math.asin(Math.max(-1, Math.min(1, p[2]))) / DEG;
  const lon = (Math.atan2(p[1], p[0]) / DEG + 360) % 360;
  return [
    proj.lineOffset - lat * proj.pixelsPerDeg,
    proj.sampleOffset + (lon - proj.centerLonDeg) * proj.pixelsPerDeg,
  ];
}

/**
 * Whether a cylindrical grid spans the whole 360° of longitude, as LDEM_128
 * and the LDEM_256/512 mosaics do. Their first pixel centre sits half a
 * pixel east of 0° E and their last half a pixel west of 360° E, so the
 * strip between them is read across the seam (VENT-44).
 */
function wrapsLongitude(grid: DemGrid): boolean {
  const proj = grid.projection;
  if (proj.kind !== 'cylindrical') return false;
  return Math.abs(grid.samples / proj.pixelsPerDeg - 360) < 1e-6;
}

/**
 * The height in metres of the point `p` (a unit vector), bilinear between
 * the four pixels around it; NaN when it falls outside the grid or a pixel
 * has no height. A grid spanning 360° of longitude has no east-west edge.
 */
export function demHeightAt(grid: DemGrid, p: Vec3): number {
  const [line, sample] = pixelOf(grid, p);
  const wraps = wrapsLongitude(grid);
  const inside =
    line >= 0 &&
    line <= grid.lines - 1.001 &&
    (wraps || (sample >= 0 && sample <= grid.samples - 1.001));
  if (!inside) return Number.NaN;
  const l0 = Math.floor(line);
  const s0 = Math.floor(sample);
  const fl = line - l0;
  const fs = sample - s0;
  // pixelOf keeps a wrapping sample within -0.5 .. samples - 0.5.
  const n = grid.samples;
  const sa = wraps ? (s0 + n) % n : s0;
  const sb = wraps ? (s0 + 1) % n : s0 + 1;
  const { dnAt } = grid;
  const top = dnAt(l0, sa) * (1 - fs) + dnAt(l0, sb) * fs;
  const low = dnAt(l0 + 1, sa) * (1 - fs) + dnAt(l0 + 1, sb) * fs;
  return (top * (1 - fl) + low * fl) * grid.metresPerDn;
}

/** A grid over a whole array of DNs, row by row (a crop or a test). */
export function arrayGrid(
  meta: Omit<DemGrid, 'dnAt'>,
  dn: Int16Array,
): DemGrid {
  const { samples } = meta;
  return { ...meta, dnAt: (l, s) => dn[l * samples + s] ?? Number.NaN };
}
