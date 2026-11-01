#!/usr/bin/env node
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
 * Bakes the Earth's land mask that the DSN view draws (VENT-7): Natural
 * Earth's 1:110m land polygons (public domain), from the TopoJSON of the
 * `world-atlas` package 2.0.2 (`land-110m.json`), sampled at the centre of
 * every 1° cell and written as runs of land per row of latitude.
 *
 *   node packages/web/scripts/earth-land.mjs <land-110m.json> [out.json]
 *
 * Output: `{ step, rows }`, row 0 the band from 90° N to 89° N, each row a
 * flat list of [first cell, cell count] pairs counted east from 180° W.
 * Deterministic: the same input writes the same bytes (see ASSETS.md).
 */
import { readFileSync, writeFileSync } from 'node:fs';

const STEP = 1;
/**
 * Antarctica's ring closes along the pole, which a test in longitude and
 * latitude cannot follow: south of this every cell is land.
 */
const POLAR_CAP_LAT = -84;

/** The arcs of a quantized TopoJSON, as absolute [lon, lat] points. */
function decodeArcs(topology) {
  const [sx, sy] = topology.transform.scale;
  const [tx, ty] = topology.transform.translate;
  return topology.arcs.map((arc) => {
    let [x, y] = [0, 0];
    return arc.map(([dx, dy]) => {
      x += dx;
      y += dy;
      return [x * sx + tx, y * sy + ty];
    });
  });
}

/** Every ring of the `land` object, as closed lists of points. */
function landRings(topology) {
  const arcs = decodeArcs(topology);
  const ring = (indices) =>
    indices.flatMap((i, n) => {
      const points = i < 0 ? [...arcs[~i]].reverse() : arcs[i];
      return n === 0 ? points : points.slice(1);
    });
  const polygons = topology.objects.land.geometries.flatMap((g) =>
    g.type === 'Polygon' ? [g.arcs] : g.arcs,
  );
  return polygons.flatMap((polygon) => polygon.map(ring));
}

/** Even-odd test of a point against every ring. */
function inside(rings, lon, lat) {
  let odd = false;
  for (const points of rings) {
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const [xi, yi] = points[i];
      const [xj, yj] = points[j];
      if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) odd = !odd;
    }
  }
  return odd;
}

const [input, output = 'packages/web/src/dsn/land.json'] = process.argv.slice(2);
if (!input) {
  console.error('usage: earth-land.mjs <land-110m.json> [out.json]');
  process.exit(2);
}
const rings = landRings(JSON.parse(readFileSync(input, 'utf8')));
const rows = [];
for (let lat = 90 - STEP / 2; lat > -90; lat -= STEP) {
  const runs = [];
  let start = -1;
  const cells = 360 / STEP;
  for (let c = 0; c <= cells; c++) {
    const lon = -180 + (c + 0.5) * STEP;
    const land = c < cells && (lat < POLAR_CAP_LAT || inside(rings, lon, lat));
    if (land && start < 0) start = c;
    if (!land && start >= 0) {
      runs.push(start, c - start);
      start = -1;
    }
  }
  rows.push(runs);
}
writeFileSync(output, `${JSON.stringify({ step: STEP, rows })}\n`);
console.log(`${output}: ${rows.flat().length / 2} runs`);
