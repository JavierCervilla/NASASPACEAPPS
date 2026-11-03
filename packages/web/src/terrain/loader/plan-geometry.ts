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
 * The loader's plan from above (VENT-60, B): a round scope over the point,
 * turned so the view's heading is up, at the scale the canvas measured
 * (6 km across the scope's inner 86 % while the 2 km tiles land, four times
 * wider once the 8 km tiles start). A tile is placed by its own corners,
 * read through `sampleDirection` onto the site's tangent plane, so any
 * scheme lies right. The field's wedge is as wide as the scene's camera
 * sees across. Pure.
 */
import {
  LUNAR_RADIUS_M, TILE_CELLS, sampleDirection, tileGeoref, type TileKey,
} from '@ventana/sim';
import type { Frame } from '../ring/ring-frame';
import { dot } from '../vec3';
import type { Vec3 } from '../view-camera';
import type { Point, Size } from './band-types';

const RAD = Math.PI / 180;
/** Metres across the scope's inner 86 % at the near zoom. */
const NEAR_SPAN_M = 6000;
const INNER = 0.86;
/** The scale once the 8 km tiles start: four times wider. */
export const ZOOMED_OUT = 0.25;

export interface PlanLayout {
  /** The scope's diameter, px. */
  readonly box: number;
  /** The scope's centre from the band's top, px. */
  readonly cy: number;
  /** Px per metre at the near zoom. */
  readonly pxPerM: number;
  /** Where the words start under the scope, px from the band's top. */
  readonly statusTop: number;
}

/** Room the words take under the scope on a phone, px. */
const PHONE_WORDS_PX = 106;
const MIN_BOX = 64;

/**
 * The scope in a band of `size`: the canvas's measures, and on a phone
 * whose band is short (the sheet at half) a smaller scope, held up so the
 * words still fit under it.
 */
export function planLayout({ w, h }: Size, phone: boolean): PlanLayout {
  const box = Math.max(MIN_BOX,
    phone ? Math.min(w - 40, h - 130) : Math.min(w - 48, h - 120));
  const cy = phone ? Math.min(h * 0.42, h - box / 2 - PHONE_WORDS_PX)
    : (h - 96) / 2 + 6;
  const statusTop = Math.round(cy + box / 2 + (phone ? 26 : 14));
  return { box, cy, pxPerM: (box * INNER) / NEAR_SPAN_M, statusTop };
}

/** A tile's corner nodes: row 0 col 0, row 0 col 128 and row 128 col 0. */
export interface Corners {
  readonly origin: Point;
  readonly col: Point;
  readonly row: Point;
}

/** `dir` on the plan, metres: right of the heading, and down the screen. */
function onPlan(frame: Frame, dir: Vec3, yawDeg: number): Point {
  const east = dot(dir, frame.east) * LUNAR_RADIUS_M;
  const north = dot(dir, frame.north) * LUNAR_RADIUS_M;
  const [s, c] = [Math.sin(yawDeg * RAD), Math.cos(yawDeg * RAD)];
  return [east * c - north * s, -(east * s + north * c)];
}

/** Where `key`'s corners lie on the plan, metres from the point. */
export function tileCorners(
  key: TileKey,
  frame: Frame,
  yawDeg: number,
): Corners {
  const g = tileGeoref(key);
  const at = (row: number, col: number): Point =>
    onPlan(frame, sampleDirection(g, row, col), yawDeg);
  return { origin: at(0, 0), col: at(0, TILE_CELLS),
    row: at(TILE_CELLS, 0) };
}

/**
 * The CSS `matrix()` that lays a {@link TILE_CELLS} px square on
 * `corners`, at `pxPerM`: columns along its x, rows along its y.
 */
export function tileMatrix(corners: Corners, pxPerM: number): number[] {
  const { origin, col, row } = corners;
  const k = pxPerM / TILE_CELLS;
  return [(col[0] - origin[0]) * k, (col[1] - origin[1]) * k,
    (row[0] - origin[0]) * k, (row[1] - origin[1]) * k,
    origin[0] * pxPerM, origin[1] * pxPerM];
}

/** Azimuth `azDeg` on a rim of radius `r`, from its centre: heading up. */
export function rimAt(azDeg: number, yawDeg: number, r: number): Point {
  const a = (azDeg - yawDeg) * RAD;
  return [Math.sin(a) * r, -Math.cos(a) * r];
}
