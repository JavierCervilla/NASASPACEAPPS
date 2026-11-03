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
 * The graticule's lines on the Moon (VENT-50): the parallels at 85° S, 80° S
 * and 70° S, and the meridians at 0°, 45° and 90° east and west, from the
 * south pole on to the limb. One indexed set of segments, a few hundred
 * vertices, drawn in a single call. Pure: the Three.js object is made in
 * scene.ts.
 */
import { latLonToVector } from '../geo';

export const PARALLELS_DEG = [-85, -80, -70] as const;
export const MERIDIANS_EAST_DEG = [-90, -45, 0, 45, 90] as const;

/**
 * A hair above the Moon's radius 1: the 64-segment sphere's faces fall up
 * to 0.0012 inside it, so no line sinks under them; at 0.002 the line
 * hugs the limb by a fraction of a pixel.
 */
export const GRATICULE_RADIUS = 1.002;

/** Degrees between vertices: a chord then dips 0.0006 under its arc. */
const STEP_DEG = 4;

export interface LineSegmentsData {
  /** x, y, z of every vertex, in Moon radii. */
  readonly positions: Float32Array;
  /** Pairs of vertex numbers, one pair per segment. */
  readonly index: Uint16Array;
}

/** A vertex as latitude and east longitude, degrees. */
type Vertex = readonly [number, number];

/** The vertices gathered so far, and the pairs of them joined by a segment. */
interface Gathered {
  readonly vertices: Vertex[];
  readonly pairs: number[];
}

/** The vertices of the parallel at `lat`, once round (it closes on itself). */
function ring(lat: number): Vertex[] {
  const count = 360 / STEP_DEG;
  return Array.from({ length: count }, (_, i) => [lat, i * STEP_DEG - 180]);
}

/** The vertices of the meridian at `lonEast`, from pole to pole. */
function meridian(lonEast: number): Vertex[] {
  const count = 180 / STEP_DEG;
  return Array.from({ length: count + 1 }, (_, i) => [
    i * STEP_DEG - 90,
    lonEast,
  ]);
}

/** Appends `line`'s vertices and the segments joining them. */
function addLine(into: Gathered, line: Vertex[], closed: boolean): void {
  const first = into.vertices.length;
  into.vertices.push(...line);
  const last = line.length - (closed ? 0 : 1);
  for (let i = 0; i < last; i += 1) {
    into.pairs.push(first + i, first + ((i + 1) % line.length));
  }
}

/** The graticule's vertices and segments. */
export function graticuleGeometry(): LineSegmentsData {
  const lines: Gathered = { vertices: [], pairs: [] };
  for (const lat of PARALLELS_DEG) addLine(lines, ring(lat), true);
  for (const lon of MERIDIANS_EAST_DEG) addLine(lines, meridian(lon), false);
  const positions = lines.vertices.flatMap(([lat, lon]) => {
    const { x, y, z } = latLonToVector(lat, lon, GRATICULE_RADIUS);
    return [x, y, z];
  });
  return {
    positions: Float32Array.from(positions),
    index: Uint16Array.from(lines.pairs),
  };
}
