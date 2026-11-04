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
 * A fine tile as the ground shader reads it (VENT-62): its slopes and
 * feather weight as texels, and the affine map from the view's frame
 * (metres east and north of the site) to the polar plane the tile lies on.
 * Pure.
 */
import type { Frame } from '../ring/ring-frame';
import { fromLocal } from '../ring/ring-frame';
import type { FineGrid } from './fine-load';
import { planeOfDir } from './fine-catalog';

/** Slopes beyond this (rise over run) are clipped: 45° and more. */
const MAX_SLOPE = 1;
const encode = (s: number): number =>
  Math.round(128 + 127 * Math.max(-MAX_SLOPE, Math.min(MAX_SLOPE, s)));

/**
 * RGBA, row-major from the north: red dh/dx (east-ish, plane +X), green
 * dh/dy (plane +Y, north-ish), blue the weight, alpha 255. Central
 * differences, one-sided at the edge.
 */
export function slopeTexels(grid: FineGrid): Uint8Array {
  const { size, heights, site } = grid;
  const clamp = (v: number): number => Math.min(size - 1, Math.max(0, v));
  const at = (r: number, c: number): number =>
    heights[clamp(r) * size + clamp(c)] ?? 0;
  const out = new Uint8Array(size * size * 4);
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const o = (r * size + c) * 4;
      out[o] = encode((at(r, c + 1) - at(r, c - 1)) / (2 * site.pixelM));
      out[o + 1] = encode((at(r - 1, c) - at(r + 1, c)) / (2 * site.pixelM));
      out[o + 2] = Math.round(255 * (grid.weights[r * size + c] ?? 0));
      out[o + 3] = 255;
    }
  }
  return out;
}

/** Plane position of the site, and of a metre east and a metre north. */
export interface PlaneAffine {
  readonly x0: number;
  readonly y0: number;
  /** Plane displacement per metre east. */
  readonly xe: number;
  readonly ye: number;
  /** Plane displacement per metre north. */
  readonly xn: number;
  readonly yn: number;
}

const PROBE_M = 100;

/** The plane position of local (`east`, `north`) at the frame's ground. */
const planeAt = (frame: Frame, east: number, north: number) =>
  planeOfDir(fromLocal(frame, east, north, frame.groundM));

/** The affine map of `frame`, from finite differences over 100 m. */
export function planeAffine(frame: Frame): PlaneAffine {
  const [x0, y0] = planeAt(frame, 0, 0);
  const [ex, ey] = planeAt(frame, PROBE_M, 0);
  const [nx, ny] = planeAt(frame, 0, PROBE_M);
  return { x0, y0, xe: (ex - x0) / PROBE_M, ye: (ey - y0) / PROBE_M,
    xn: (nx - x0) / PROBE_M, yn: (ny - y0) / PROBE_M };
}
