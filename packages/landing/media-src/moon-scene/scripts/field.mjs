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
 * The seamless height field of a site: every source resampled into one
 * continuous function over the whole Moon, metres over the 1 737 400 m
 * sphere. Built once per site and tile version, then cached
 * (cache/field/), because every shadow worker reads it.
 *
 * Sources, finest first: the site's fine DTM (the app's 5 m tile, LROC NAC),
 * then the four levels of Ventana Lunar's levelled LOLA tiles (15.6 m to
 * 1 km nodes), then the bare sphere. Three things keep it free of any tile
 * or level structure:
 *
 * 1. Each level's mosaic is one grid: neighbouring tiles share their edge
 *    nodes, so a level has no seam of its own.
 * 2. Pyramid consistency: wherever a finer source covers, the coarser grid's
 *    nodes are replaced by the finer data low-passed to their spacing (a
 *    tent over the finer nodes), so two levels agree where they are blended
 *    and the blend changes only the resolution, never the height (levels
 *    otherwise read different LOLA tiers, metres apart).
 * 3. Wide feathered blends in space: a level is used fully within 35 % of
 *    its radius and fades into the next coarser one by 80 %; the fine DTM
 *    fades in over 300 m from its edge.
 *
 * LOLA's 20 m grid carries along-track artefacts (dotted lines of single
 * bad shots and thin ridges along the tracks). Levels 0 and 1 are cleaned
 * before the pyramid: single-node spikes are replaced by the 3 x 3 median,
 * then a one-node Gaussian is applied across the track direction only (the
 * direction found in the data, where the high-passed relief correlates
 * most along a line). Craters wider than about three nodes keep their shape.
 *
 * `heightSmooth` reads every grid with Catmull-Rom (C1, so the normals,
 * taken from the merged field by the mesh, have no creases at the nodes);
 * `heightFast` reads bilinear, for the shadow rays.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { readGreyPng } from './png.mjs';
import { RADIUS_M, levelsOf, polarXY } from './sites.mjs';

const TILES = fileURLToPath(new URL('../cache/tiles/', import.meta.url));
const FIELDS = fileURLToPath(new URL('../cache/field/', import.meta.url));
/** bump when the field's making changes, so caches are rebuilt */
const FIELD_VERSION = 4;
const N = 129;
const FULL = 0.35;
const NONE = 0.8;
const FINE_FEATHER_M = 300;

function smoothstep(a, b, x) {
  const t = Math.min(Math.max((x - a) / (b - a), 0), 1);
  return t * t * (3 - 2 * t);
}

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
  const cols = (lv.x1 - lv.x0 + 1) * 128 + 1;
  const rows = (lv.y1 - lv.y0 + 1) * 128 + 1;
  const data = new Float32Array(cols * rows);
  for (const { x, y } of lv.keys) {
    const tile = JSON.parse(readFileSync(`${TILES}${lv.level}/${x}_${y}.json`, 'utf8'));
    const h = decode(tile);
    const c0 = (x - lv.x0) * 128;
    const r0 = (lv.y1 - y) * 128;
    for (let r = 0; r < N; r++) data.set(h.subarray(r * N, r * N + N), (r0 + r) * cols + c0);
  }
  return { level: lv.level, radiusM: lv.radiusM, spacingM: lv.spacingM, minX: lv.x0 * lv.sizeM, maxY: (lv.y1 + 1) * lv.sizeM, cols, rows, data };
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

/** Grid coordinates (col, row) of a plane point in a grid. */
const gridOf = (m, x, y) => [(x - m.minX) / m.spacingM, (m.maxY - y) / m.spacingM];

/** The direction (radians, in grid col/row) along which the high-passed relief correlates most. */
function trackAngle(m) {
  const at = (c, r) => bilinear(m, c, r) - 0.25 * (bilinear(m, c - 2, r) + bilinear(m, c + 2, r) + bilinear(m, c, r - 2) + bilinear(m, c, r + 2));
  const score = (a) => {
    let s = 0;
    const [dc, dr] = [Math.cos(a) * 6, Math.sin(a) * 6];
    for (let r = 20; r < m.rows - 20; r += 5) for (let c = 20; c < m.cols - 20; c += 5) s += at(c, r) * at(c + dc, r + dr);
    return s;
  };
  let best = 0;
  let bestScore = -Infinity;
  for (let deg = 0; deg < 180; deg += 2) {
    const s = score((deg * Math.PI) / 180);
    if (s > bestScore) [best, bestScore] = [deg, s];
  }
  return (best * Math.PI) / 180;
}

/** Spikes out (3 x 3 median where a node departs from it by more than `spike` m), then a Gaussian across the track. */
function destripe(m, spike) {
  const { cols, rows } = m;
  const src = m.data;
  const out = new Float32Array(src);
  const win = new Float32Array(9);
  for (let r = 1; r < rows - 1; r++) {
    for (let c = 1; c < cols - 1; c++) {
      let k = 0;
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) win[k++] = src[(r + dr) * cols + c + dc];
      win.sort();
      if (Math.abs(src[r * cols + c] - win[4]) > spike) out[r * cols + c] = win[4];
    }
  }
  const a = trackAngle({ ...m, data: out });
  const [ac, ar] = [-Math.sin(a), Math.cos(a)];
  const weights = [-3, -2, -1, 0, 1, 2, 3].map((k) => [k, Math.exp(-0.5 * k * k)]);
  const total = weights.reduce((s, [, w]) => s + w, 0);
  const despiked = { ...m, data: out };
  const smooth = new Float32Array(out.length);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      let s = 0;
      for (const [k, w] of weights) s += w * bilinear(despiked, c + ac * k, r + ar * k);
      smooth[r * cols + c] = s / total;
    }
  }
  return { ...m, data: smooth, trackDeg: (a * 180) / Math.PI };
}

/** A separable Gaussian blur of a grid (sigma in nodes, edges clamped). */
function blurred(src, cols, rows, sigma) {
  const reach = Math.ceil(3 * sigma);
  const k = Array.from({ length: 2 * reach + 1 }, (_, i) => Math.exp(-0.5 * ((i - reach) / sigma) ** 2));
  const total = k.reduce((a, b) => a + b, 0);
  const pass = (from, along) => {
    const out = new Float32Array(from.length);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        let s = 0;
        for (let i = -reach; i <= reach; i++) {
          const cc = along ? Math.min(cols - 1, Math.max(0, c + i)) : c;
          const rr = along ? r : Math.min(rows - 1, Math.max(0, r + i));
          s += k[i + reach] * from[rr * cols + cc];
        }
        out[r * cols + c] = s / total;
      }
    }
    return out;
  };
  return pass(pass(src, true), false);
}

/** The fine DTM tile of the app (5 m, polar plane) as a grid, or null. */
function fineOf(site) {
  if (!site.fine || !existsSync(`${site.fine}tile.json`)) return null;
  const meta = JSON.parse(readFileSync(`${site.fine}tile.json`, 'utf8'));
  const g = meta.georeference;
  const h = meta.layers.heights;
  const png = readGreyPng(`${site.fine}${h.file}`);
  const data = Float32Array.from(png.data, (dn) => h.offset_m + dn * h.step_m);
  // where the fine source has no height the tile holds LOLA interpolated: blend those out softly
  const mask = readGreyPng(`${site.fine}${meta.layers.mask.file}`);
  const weight = blurred(Float32Array.from(mask.data), g.width, g.height, 3);
  // pixel centres: area pixels, so half a pixel in from the upper-left corner
  return {
    level: -1, spacingM: g.pixel_m, cols: g.width, rows: g.height, data, weight,
    minX: g.upper_left_m[0] + g.pixel_m / 2, maxY: g.upper_left_m[1] - g.pixel_m / 2,
    source: meta.sources.fine.product,
  };
}

/** The fine grid's weight at a plane point: feathered from its edge and from its holes. */
function fineWeight(fine, x, y, feather) {
  const edge = smoothstep(0, feather, insideBy(fine, x, y) - 20);
  if (edge <= 0) return 0;
  const [c, r] = gridOf(fine, x, y);
  return edge * smoothstep(0.55, 0.95, bilinear({ ...fine, data: fine.weight }, c, r));
}

/** How far inside a grid's edge a plane point lies, metres (negative outside). */
function insideBy(m, x, y) {
  const [c, r] = gridOf(m, x, y);
  return Math.min(c, r, m.cols - 1 - c, m.rows - 1 - r) * m.spacingM;
}

/** The finer grid low-passed at a plane point: a tent over its nodes, `ratio` nodes wide each way. */
function lowpass(fine, x, y, spacingM) {
  const [c, r] = gridOf(fine, x, y);
  const k = spacingM / fine.spacingM;
  const reach = Math.ceil(k) - 1;
  let s = 0;
  let w = 0;
  for (let dr = -reach; dr <= reach; dr++) {
    for (let dc = -reach; dc <= reach; dc++) {
      const wt = (k - Math.abs(dc)) * (k - Math.abs(dr));
      s += wt * bilinear(fine, Math.round(c) + dc, Math.round(r) + dr);
      w += wt;
    }
  }
  return s / w;
}

/** Make `coarse` agree with `fine` wherever `fine` is blended in (its weight `weightAt`). */
function agree(coarse, fine, weightAt) {
  for (let r = 0; r < coarse.rows; r++) {
    for (let c = 0; c < coarse.cols; c++) {
      const x = coarse.minX + c * coarse.spacingM;
      const y = coarse.maxY - r * coarse.spacingM;
      const w = weightAt(x, y);
      if (w <= 0) continue;
      const i = r * coarse.cols + c;
      coarse.data[i] += (lowpass(fine, x, y, coarse.spacingM) - coarse.data[i]) * w;
    }
  }
}

function build(site) {
  const [tx, ty] = polarXY(site.latDeg, site.lonEastDeg);
  const levels = levelsOf(site).map(mosaicOf);
  levels[0] = destripe(levels[0], 0.35);
  levels[1] = destripe(levels[1], 0.35);
  const fine = fineOf(site);
  const dist = (x, y) => Math.hypot(x - tx, y - ty);
  // coarse nodes take the finer data low-passed until a little past where the finer grid stops being sampled
  if (fine) agree(levels[0], fine, (x, y) => fineWeight(fine, x, y, 60));
  for (let k = 1; k < levels.length; k++) {
    const f = levels[k - 1];
    agree(levels[k], f, (x, y) => (insideBy(f, x, y) < 4 * levels[k].spacingM ? 0 : 1 - smoothstep(0.85 * f.radiusM, 0.98 * f.radiusM, dist(x, y))));
  }
  return { tx, ty, fine, levels };
}

function cachePath(site) {
  const version = JSON.parse(readFileSync(`${TILES}version.json`, 'utf8')).version;
  return `${FIELDS}${site.id}-${version}-v${FIELD_VERSION}.bin`;
}

/** Writes the built field's grids as one binary file (a JSON header, then float32). */
function save(path, field) {
  const fineWeights = field.fine ? [{ ...field.fine, level: -2, data: field.fine.weight }] : [];
  const grids = [field.fine, ...fineWeights, ...field.levels].filter(Boolean);
  const meta = (g) => Object.fromEntries(Object.entries(g).filter(([k]) => k !== 'data' && k !== 'weight'));
  const header = Buffer.from(JSON.stringify({ tx: field.tx, ty: field.ty, grids: grids.map(meta) }));
  const len = Buffer.alloc(4);
  len.writeUInt32LE(header.length, 0);
  const pad = Buffer.alloc((4 - ((4 + header.length) % 4)) % 4);
  mkdirSync(FIELDS, { recursive: true });
  writeFileSync(path, Buffer.concat([len, header, pad, ...grids.map((g) => Buffer.from(g.data.buffer, g.data.byteOffset, g.data.byteLength))]));
}

function load(path) {
  const buf = readFileSync(path);
  const n = buf.readUInt32LE(0);
  const head = JSON.parse(buf.toString('utf8', 4, 4 + n));
  let at = 4 + n + ((4 - ((4 + n) % 4)) % 4);
  const grids = head.grids.map((g) => {
    const data = new Float32Array(buf.buffer.slice(buf.byteOffset + at, buf.byteOffset + at + g.cols * g.rows * 4));
    at += g.cols * g.rows * 4;
    return { ...g, data };
  });
  const fine = grids[0].level === -1 ? grids.shift() : null;
  if (fine) fine.weight = grids.shift().data;
  return { tx: head.tx, ty: head.ty, fine, levels: grids };
}

/** The site's field: from the cache, or built and cached (a few seconds). */
export function loadField(site) {
  const path = cachePath(site);
  if (existsSync(path)) return load(path);
  const field = build(site);
  save(path, field);
  return load(path);
}

function blended(t, x, y, sample) {
  let h = 0;
  let rest = 1;
  if (t.fine) {
    const w = fineWeight(t.fine, x, y, FINE_FEATHER_M);
    if (w > 0) {
      const [c, r] = gridOf(t.fine, x, y);
      h += w * sample(t.fine, c, r);
      rest -= w;
    }
  }
  const d = Math.hypot(x - t.tx, y - t.ty);
  for (const m of t.levels) {
    if (rest <= 1e-9) break;
    const w = (1 - smoothstep(FULL * m.radiusM, NONE * m.radiusM, d)) * rest;
    if (w > 0) {
      const [c, r] = gridOf(m, x, y);
      h += w * sample(m, c, r);
    }
    rest -= w;
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

/** The field's highest point, metres: no ray above it is shadowed. */
export function maxHeight(t) {
  let max = -Infinity;
  for (const m of [t.fine, ...t.levels].filter(Boolean)) for (const v of m.data) if (v > max) max = v;
  return max;
}
