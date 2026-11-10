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
 * The relief the hero film stands on, read from the tile cache: one mosaic
 * per level of the levelled tiles (scripts/regions.mjs), and one height
 * function over the whole Moon that blends them by distance from the
 * touchdown point. Each level is used inside its square and fades into the
 * next coarser one over the outer fifth of its radius, and level 3 fades into
 * the bare sphere, so the surface has no seam and no level boundary: it is
 * one static field, which is what keeps the film free of popping.
 *
 * Heights are metres over the 1 737 400 m sphere. `heightSmooth` reads the
 * finest levels with Catmull-Rom (C1, so the shading has no grid creases at
 * the 15.6 m nodes); `heightFast` reads bilinear, for the shadow rays.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { LEVELS, RADIUS_M, TARGET, polarXY, tilesOf } from './regions.mjs';

const CACHE = fileURLToPath(new URL('../cache/tiles/', import.meta.url));
const N = 129;

function decode(tile) {
  const bytes = Buffer.from(tile.heights, 'base64');
  const out = new Float32Array(N * N);
  for (let i = 0; i < out.length; i++) {
    const q = bytes.readUInt16LE(i * 2);
    out[i] = q === 65535 ? 0 : (tile.baseUnits + q) * tile.quantumM;
  }
  return out;
}

function mosaicOf(lv) {
  const { keys, x0, x1, y0, y1 } = tilesOf(lv);
  const cols = (x1 - x0 + 1) * 128 + 1;
  const rows = (y1 - y0 + 1) * 128 + 1;
  const data = new Float32Array(cols * rows);
  for (const { x, y } of keys) {
    const tile = JSON.parse(readFileSync(`${CACHE}${lv.level}/${x}_${y}.json`, 'utf8'));
    const h = decode(tile);
    const c0 = (x - x0) * 128;
    const r0 = (y1 - y) * 128;
    for (let r = 0; r < N; r++) data.set(h.subarray(r * N, r * N + N), (r0 + r) * cols + c0);
  }
  return { ...lv, minX: x0 * lv.sizeM, maxY: (y1 + 1) * lv.sizeM, cols, rows, data };
}

/** Loads the four mosaics from the cache (about 60 MB of float32). */
export function loadTerrain() {
  const [tx, ty] = polarXY(TARGET.latDeg, TARGET.lonEastDeg);
  return { tx, ty, levels: LEVELS.map(mosaicOf) };
}

function bilinear(m, col, row) {
  const c = Math.min(Math.max(col, 0), m.cols - 1.001);
  const r = Math.min(Math.max(row, 0), m.rows - 1.001);
  const c0 = Math.floor(c);
  const r0 = Math.floor(r);
  const fc = c - c0;
  const fr = r - r0;
  const i = r0 * m.cols + c0;
  const d = m.data;
  const top = d[i] + (d[i + 1] - d[i]) * fc;
  const bottom = d[i + m.cols] + (d[i + m.cols + 1] - d[i + m.cols]) * fc;
  return top + (bottom - top) * fr;
}

function cr(p0, p1, p2, p3, t) {
  return p1 + 0.5 * t * (p2 - p0 + t * (2 * p0 - 5 * p1 + 4 * p2 - p3 + t * (3 * (p1 - p2) + p3 - p0)));
}

function catmullRom(m, col, row) {
  const c = Math.min(Math.max(col, 1), m.cols - 2.001);
  const r = Math.min(Math.max(row, 1), m.rows - 2.001);
  const c0 = Math.floor(c);
  const r0 = Math.floor(r);
  const d = m.data;
  const line = (rr) => {
    const i = rr * m.cols + c0;
    return cr(d[i - 1], d[i], d[i + 1], d[i + 2], c - c0);
  };
  return cr(line(r0 - 1), line(r0), line(r0 + 1), line(r0 + 2), r - r0);
}

function smoothstep(a, b, x) {
  const t = Math.min(Math.max((x - a) / (b - a), 0), 1);
  return t * t * (3 - 2 * t);
}

/** How much of level `m` a plane point at distance `d` from the target uses. */
function weightOf(m, d) {
  return 1 - smoothstep(0.75 * m.radiusM, 0.95 * m.radiusM, d);
}

function blended(t, x, y, sample) {
  const d = Math.hypot(x - t.tx, y - t.ty);
  let h = 0;
  let rest = 1;
  for (const m of t.levels) {
    const w = weightOf(m, d) * rest;
    if (w > 0) h += w * sample(m, (x - m.minX) / m.spacingM, (m.maxY - y) / m.spacingM);
    rest -= w;
    if (rest <= 1e-9) break;
  }
  return h;
}

/** Height (Catmull-Rom) at a polar-plane point, metres; 0 outside the data. */
export function heightSmooth(t, x, y) {
  return blended(t, x, y, catmullRom);
}

/** Height (bilinear) at a polar-plane point, metres; 0 outside the data. */
export function heightFast(t, x, y) {
  return blended(t, x, y, bilinear);
}

/**
 * The polar-plane point of a direction (x to 0° E, y to 90° E, z north), or
 * null on the northern hemisphere, where no level reaches.
 */
export function planeOf(px, py, pz) {
  if (pz > 0) return null;
  const k = (2 * RADIUS_M) / (1 - pz);
  return [k * py, k * px];
}

/** The level-3 data's highest point, metres: no ray above it is shadowed. */
export function maxHeight(t) {
  let max = -Infinity;
  for (const m of t.levels) for (const v of m.data) if (v > max) max = v;
  return max;
}
