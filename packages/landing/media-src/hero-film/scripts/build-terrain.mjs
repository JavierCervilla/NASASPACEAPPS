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
 * Builds the hero film's Moon as ONE static mesh (media/mesh/terrain.glb) and
 * its frame (media/mesh/terrain.json), from the tile cache and sky.json.
 *
 * The mesh is a log-polar grid centred on IM-2's touchdown point: rings at
 * geodesic distances growing by a constant ratio from 0.4 m out to the far
 * side of the Moon, each with the same number of vertices around. Its
 * triangles are as many pixels wide wherever a camera near the target looks,
 * so one mesh holds the whole Moon at 4 lunar radii and the regolith 2 m
 * below the lens, and nothing ever switches level: there is no popping by
 * construction. Heights come from terrain-data.mjs (the levels blended by
 * distance, the bare sphere past ~500 km, where the shader's LOLA normal map
 * carries the relief instead).
 *
 * Per vertex: its position in the film's world (metres; origin on the ground
 * at the touchdown point, +X east, +Y up, +Z south there), its normal, and
 * TEXCOORD_0 = (sunlit share of the Sun's disc, normal-map weight). The
 * sunlit share is ray-marched toward the Sun over the same relief, so the
 * shadows are those of the instant, soft only by the Sun's own 0.53°.
 *
 *   node packages/landing/media-src/hero-film/scripts/build-terrain.mjs [--around N] [--ratio Q]
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { availableParallelism } from 'node:os';
import { fileURLToPath } from 'node:url';
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { writeGlb } from './glb.mjs';
import { RADIUS_M, TARGET } from './regions.mjs';
import { heightFast, heightSmooth, loadTerrain, maxHeight, planeOf } from './terrain-data.mjs';

const SUN_RADIUS_RAD = (0.2666 * Math.PI) / 180;
const DEG = Math.PI / 180;

function unit(latDeg, lonDeg) {
  const a = latDeg * DEG;
  const o = lonDeg * DEG;
  return [Math.cos(a) * Math.cos(o), Math.cos(a) * Math.sin(o), Math.sin(a)];
}

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? Number(process.argv[i + 1]) : fallback;
}

/**
 * The sunlit share of the Sun's disc seen from P (Moon frame, metres). The
 * ray starts half a metre over the higher of the two interpolations of the
 * ground there, so the bilinear relief the ray reads never shadows the
 * vertex it starts from.
 */
function sunlit(t, P0, s, hMax) {
  const r0 = Math.hypot(P0[0], P0[1], P0[2]);
  if ((P0[0] * s[0] + P0[1] * s[1] + P0[2] * s[2]) / r0 < -0.3) return 0;
  const pl0 = planeOf(P0[0] / r0, P0[1] / r0, P0[2] / r0);
  const lift = Math.max(0, (pl0 ? RADIUS_M + heightFast(t, pl0[0], pl0[1]) : RADIUS_M) - r0) + 0.5;
  const P = P0.map((x) => x * (1 + lift / r0));
  let m = -1;
  for (let d = 1; d < 2.5e6; d = d * 1.015 + 0.5) {
    const qx = P[0] + s[0] * d;
    const qy = P[1] + s[1] * d;
    const qz = P[2] + s[2] * d;
    const rq = Math.hypot(qx, qy, qz);
    if (rq - RADIUS_M > hMax + 20) break;
    const pl = planeOf(qx / rq, qy / rq, qz / rq);
    const h = pl ? heightFast(t, pl[0], pl[1]) : 0;
    const blocked = (RADIUS_M + h - rq) / d;
    if (blocked > m) m = blocked;
    if (m > SUN_RADIUS_RAD) return 0;
  }
  const x = Math.max(-1, Math.min(1, -m / SUN_RADIUS_RAD));
  return 1 - Math.acos(x) / Math.PI + (x * Math.sqrt(1 - x * x)) / Math.PI;
}

function shadowWorker() {
  const { start, end, moonPos, sun } = workerData;
  const t = loadTerrain();
  const hMax = maxHeight(t);
  const P = new Float64Array(moonPos);
  const out = new Float32Array(end - start);
  for (let v = start; v < end; v++) {
    out[v - start] = sunlit(t, [P[v * 3], P[v * 3 + 1], P[v * 3 + 2]], sun, hMax);
  }
  parentPort.postMessage(out, [out.buffer]);
}

function ringsOf(ratio) {
  const rings = [0];
  for (let r = 0.4; r < 600_000; r *= ratio) rings.push(r);
  for (let r = 600_000; r < Math.PI * RADIUS_M - 20_000; r *= 1.03) rings.push(r);
  return rings;
}

function frameOf(t) {
  const u = unit(TARGET.latDeg, TARGET.lonEastDeg);
  const lon = TARGET.lonEastDeg * DEG;
  const lat = TARGET.latDeg * DEG;
  const e = [-Math.sin(lon), Math.cos(lon), 0];
  const n = [-Math.sin(lat) * Math.cos(lon), -Math.sin(lat) * Math.sin(lon), Math.cos(lat)];
  const hT = heightSmooth(t, t.tx, t.ty);
  return { u, e, n, hT };
}

function buildPositions(t, f, rings, around) {
  const count = 1 + (rings.length - 1) * around;
  const moonPos = new Float64Array(new SharedArrayBuffer(count * 24));
  const world = new Float32Array(count * 3);
  const nmWeight = new Float32Array(count);
  const c = f.u.map((x) => x * (RADIUS_M + f.hT));
  const put = (v, dir, h, r) => {
    for (let k = 0; k < 3; k++) moonPos[v * 3 + k] = dir[k] * (RADIUS_M + h);
    const w = [0, 1, 2].map((k) => moonPos[v * 3 + k] - c[k]);
    world[v * 3] = w[0] * f.e[0] + w[1] * f.e[1] + w[2] * f.e[2];
    world[v * 3 + 1] = w[0] * f.u[0] + w[1] * f.u[1] + w[2] * f.u[2];
    world[v * 3 + 2] = -(w[0] * f.n[0] + w[1] * f.n[1] + w[2] * f.n[2]);
    nmWeight[v] = Math.min(1, Math.max(0, (r - 380_000) / 120_000));
  };
  put(0, f.u, f.hT, 0);
  for (let i = 1; i < rings.length; i++) {
    const th = rings[i] / RADIUS_M;
    for (let j = 0; j < around; j++) {
      const phi = (2 * Math.PI * j) / around;
      const dir = [0, 1, 2].map((k) => Math.cos(th) * f.u[k] + Math.sin(th) * (Math.cos(phi) * f.n[k] + Math.sin(phi) * f.e[k]));
      const pl = planeOf(dir[0], dir[1], dir[2]);
      put(1 + (i - 1) * around + j, dir, pl ? heightSmooth(t, pl[0], pl[1]) : 0, rings[i]);
    }
  }
  return { count, moonPos, world, nmWeight };
}

function vertexOf(i, j, around) {
  return i === 0 ? 0 : 1 + (i - 1) * around + (((j % around) + around) % around);
}

function buildIndices(rings, around) {
  const tris = around + (rings.length - 2) * around * 2;
  const idx = new Uint32Array(tris * 3);
  let k = 0;
  for (let j = 0; j < around; j++) idx.set([0, vertexOf(1, j + 1, around), vertexOf(1, j, around)], (k++) * 3);
  for (let i = 1; i < rings.length - 1; i++) {
    for (let j = 0; j < around; j++) {
      const a = vertexOf(i, j, around);
      const b = vertexOf(i, j + 1, around);
      const cc = vertexOf(i + 1, j, around);
      const d = vertexOf(i + 1, j + 1, around);
      idx.set([a, b, cc], (k++) * 3);
      idx.set([b, d, cc], (k++) * 3);
    }
  }
  return idx;
}

function buildNormals(world, rings, around) {
  const normals = new Float32Array(world.length);
  const p = (v) => [world[v * 3], world[v * 3 + 1], world[v * 3 + 2]];
  normals.set([0, 1, 0], 0);
  for (let i = 1; i < rings.length; i++) {
    for (let j = 0; j < around; j++) {
      const out = p(vertexOf(Math.min(i + 1, rings.length - 1), j, around));
      const inn = p(vertexOf(i - 1, j, around));
      const cw = p(vertexOf(i, j + 1, around));
      const ccw = p(vertexOf(i, j - 1, around));
      const a = [0, 1, 2].map((k) => out[k] - inn[k]);
      const b = [0, 1, 2].map((k) => cw[k] - ccw[k]);
      // outward x clockwise points down; clockwise x outward points up
      const n = [b[1] * a[2] - b[2] * a[1], b[2] * a[0] - b[0] * a[2], b[0] * a[1] - b[1] * a[0]];
      const len = Math.hypot(n[0], n[1], n[2]) || 1;
      normals.set(n.map((x) => x / len), vertexOf(i, j, around) * 3);
    }
  }
  return normals;
}

async function shadows(count, moonPos, sun) {
  const workers = Math.max(1, availableParallelism() - 1);
  const per = Math.ceil(count / workers);
  const parts = await Promise.all(
    Array.from({ length: workers }, (_, w) => {
      const start = w * per;
      const end = Math.min(count, start + per);
      return new Promise((done, fail) => {
        const worker = new Worker(fileURLToPath(import.meta.url), { workerData: { start, end, moonPos: moonPos.buffer, sun } });
        worker.once('message', (out) => done({ start, out }));
        worker.once('error', fail);
      });
    }),
  );
  const lit = new Float32Array(count);
  for (const { start, out } of parts) lit.set(out, start);
  return lit;
}

async function main() {
  const around = arg('around', 1024);
  const ratio = arg('ratio', 1.008);
  const sky = JSON.parse(readFileSync(new URL('../sky.json', import.meta.url), 'utf8'));
  const t0 = Date.now();
  const t = loadTerrain();
  const f = frameOf(t);
  const rings = ringsOf(ratio);
  const { count, moonPos, world, nmWeight } = buildPositions(t, f, rings, around);
  process.stdout.write(`${rings.length} rings x ${around}: ${count} vertices, ${((Date.now() - t0) / 1000).toFixed(1)} s\n`);
  const sun = unit(sky.subSolar.latDeg, sky.subSolar.lonEastDeg);
  const lit = await shadows(count, moonPos, sun);
  process.stdout.write(`shadows ${((Date.now() - t0) / 1000).toFixed(1)} s\n`);
  const uv0 = new Float32Array(count * 2);
  for (let v = 0; v < count; v++) uv0.set([lit[v], nmWeight[v]], v * 2);
  const dir = fileURLToPath(new URL('../media/mesh/', import.meta.url));
  mkdirSync(dir, { recursive: true });
  writeGlb(`${dir}terrain.glb`, { positions: world, normals: buildNormals(world, rings, around), uv0, indices: buildIndices(rings, around) });
  const frame = { target: TARGET, groundHeightM: f.hT, radiusM: RADIUS_M, east: f.e, up: f.u, north: f.n, rings: rings.length, around, ratio };
  writeFileSync(`${dir}terrain.json`, `${JSON.stringify(frame, null, 2)}\n`);
  process.stdout.write(`wrote ${dir}terrain.glb, ${((Date.now() - t0) / 1000).toFixed(1)} s\n`);
}

if (isMainThread) await main();
else shadowWorker();
