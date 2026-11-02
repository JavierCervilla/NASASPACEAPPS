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
 * A height tile around a point (VENT-34): the Moon's relief for the 3D
 * view as a fixed `n` x `n` grid in the local tangent plane, x to the
 * east and y to the north, `sizeM` metres a side. Each sample is the
 * height of the point on the sphere under it (the great circle of its
 * distance and bearing from the centre), read bilinearly from the first
 * of `grids` that has one, so a caller that lists the finest grid first
 * gets the finest data per sample, as the horizon's ray-march does.
 * Heights are metres above the sphere, relative to the centre's, rows
 * from north to south and columns from west to east. The sphere curves
 * away from the tangent plane by d² / 2R (9 m at the corner of 8 km),
 * which a caller drawing a flat mesh may subtract. Pure.
 */
import { unitVector, type Vec3 } from './horizon.ts';
import { heightFrom } from './ray-march.ts';
import { horizontalDir, pointAlong } from './ray-stops.ts';
import type { DemGrid } from './dem-grid.ts';

/** Where a tile is centred. */
export interface TileCentre {
  readonly latDeg: number;
  readonly lonEastDeg: number;
}

export interface TerrainTile {
  readonly n: number;
  readonly sizeM: number;
  /** The centre's height, metres above the sphere. */
  readonly groundM: number;
  /** `n * n` heights relative to `groundM`; 0 where no grid covered. */
  readonly heights: Float32Array;
  /** How many samples some grid covered. */
  readonly covered: number;
  /** How many samples each grid answered, by grid id. */
  readonly stopsByGrid: Readonly<Record<string, number>>;
}

interface Frame {
  readonly up: Vec3;
  readonly east: Vec3;
  readonly north: Vec3;
  readonly radiusM: number;
}

/** The unit vector of the sphere point `x` east and `y` north of the centre. */
function pointAt(frame: Frame, x: number, y: number): Vec3 {
  const d = Math.hypot(x, y);
  if (d === 0) return frame.up;
  const { east, north } = frame;
  const dir: Vec3 = [0, 1, 2].map(
    (k) => ((east[k] as number) * x + (north[k] as number) * y) / d,
  ) as unknown as Vec3;
  const theta = d / frame.radiusM;
  return pointAlong(frame.up, dir, Math.cos(theta), Math.sin(theta));
}

interface Samples {
  readonly heights: Float32Array;
  readonly counts: Map<string, number>;
}

/** Reads every sample of the tile into `out`, relative to `groundM`. */
function fillSamples(
  grids: readonly DemGrid[],
  frame: Frame,
  tile: { n: number; sizeM: number; groundM: number },
  out: Samples,
): void {
  const { n, sizeM, groundM } = tile;
  const step = sizeM / (n - 1);
  for (let row = 0; row < n; row++) {
    for (let col = 0; col < n; col++) {
      const p = pointAt(frame, -sizeM / 2 + col * step, sizeM / 2 - row * step);
      const { h, grid } = heightFrom(grids, p);
      if (!grid) continue;
      out.counts.set(grid.id, (out.counts.get(grid.id) ?? 0) + 1);
      out.heights[row * n + col] = h - groundM;
    }
  }
}

/**
 * The tile of side `sizeM` with `n` samples a side, centred on `centre`.
 *
 * @throws RangeError when `n` is not odd and at least 3 (the centre is a
 * sample), or when no grid covers the centre.
 */
export function terrainTile(
  grids: readonly DemGrid[],
  centre: TileCentre,
  sizeM: number,
  n: number,
): TerrainTile {
  if (n < 3 || n % 2 === 0) throw new RangeError('n must be odd, at least 3');
  const { latDeg, lonEastDeg } = centre;
  const up = unitVector(latDeg, lonEastDeg);
  const ground = heightFrom(grids, up);
  if (!ground.grid) throw new RangeError('point outside the grids');
  const east = horizontalDir(latDeg, lonEastDeg, 90);
  const north = horizontalDir(latDeg, lonEastDeg, 0);
  const frame = { up, east, north, radiusM: ground.grid.radiusM };
  const out = { heights: new Float32Array(n * n), counts: new Map() };
  fillSamples(grids, frame, { n, sizeM, groundM: ground.h }, out);
  const covered = [...out.counts.values()].reduce((sum, c) => sum + c, 0);
  const stopsByGrid = Object.fromEntries([...out.counts].sort());
  const { heights } = out;
  return { n, sizeM, groundM: ground.h, heights, covered, stopsByGrid };
}
