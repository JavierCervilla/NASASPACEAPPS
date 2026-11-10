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
 * Builds a site's Moon for one instant as ONE static mesh, written where the
 * consuming composition reads its media: `<out>/moon-<site>-<instant>.glb`
 * and `<out>/moon-<site>-<instant>.json` (the world frame, the sky of the
 * instant and the mesh's name).
 *
 * The mesh is a log-polar grid centred on the site's target: rings at
 * geodesic distances growing by a constant ratio from 0.4 m out to the far
 * side of the Moon, each with the same azimuths, denser inside an optional
 * sector (where a shot's last frames look, so a far ridge's silhouette stays
 * smooth through a long lens). Its triangles are about as many pixels wide
 * wherever a camera near the target looks, so one mesh holds the whole Moon
 * at several lunar radii and the ground 2 m below the lens, and nothing ever
 * switches level: there is no popping by construction. Heights and normals
 * come from the site's seamless field (field.mjs); past ~500 km the mesh is
 * the bare sphere and the shader's LOLA normal map carries the relief.
 *
 * Per vertex: its position in the world (metres; origin on the ground at the
 * target, +X east, +Y up, +Z south there), its normal, and TEXCOORD_0 =
 * (sunlit share of the Sun's disc, normal-map weight). The sunlit share is
 * ray-marched toward the Sun over the same field, so the shadows are those
 * of the instant, soft only by the Sun's own 0.53°.
 *
 * Caches (cache/, git-ignored): the geometry by site, field and mesh
 * parameters; the sunlit shares by that and the instant. A second shot at
 * another instant re-marches only the shadows; the same instant again only
 * rewrites the files.
 *
 *   node packages/landing/media-src/moon-scene/scripts/build.mjs --instant 2026-12-15T05:00:00Z --out DIR
 *        [--site im2] [--around 1024] [--ratio 1.009] [--sector 325,22,8192]
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { availableParallelism } from 'node:os';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { loadField, heightFast, heightSmooth, maxHeight, planeOf } from './field.mjs';
import { writeGlb } from './glb.mjs';
import { RADIUS_M, SITES, argOf, siteOf } from './sites.mjs';
import { skyOf } from './sky.mjs';

const SUN_RADIUS_RAD = (0.2666 * Math.PI) / 180;
const DEG = Math.PI / 180;
const CACHE = fileURLToPath(new URL('../cache/', import.meta.url));

function unit(latDeg, lonDeg) {
  const a = latDeg * DEG;
  const o = lonDeg * DEG;
  return [Math.cos(a) * Math.cos(o), Math.cos(a) * Math.sin(o), Math.sin(a)];
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
  for (let d = 1; d < 2.5e6; d = d * 1.012 + 0.5) {
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
  const { start, end, moonPos, sun, siteId } = workerData;
  const t = loadField(SITES[siteId]);
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

/** Azimuths (radians, clockwise from north): `around` steps, `sector[2]` steps inside the sector. */
function azimuthsOf(around, sector) {
  const out = [];
  const coarse = 360 / around;
  const [mid, half, dense] = sector ?? [0, 0, around];
  const fine = 360 / dense;
  const inSector = (a) => sector && Math.abs(((a - mid + 540) % 360) - 180) < half;
  for (let a = 0; a < 360 - 1e-9; a += inSector(a) ? fine : coarse) out.push(a * DEG);
  return out;
}

function frameOf(site, t) {
  const u = unit(site.latDeg, site.lonEastDeg);
  const lon = site.lonEastDeg * DEG;
  const lat = site.latDeg * DEG;
  const e = [-Math.sin(lon), Math.cos(lon), 0];
  const n = [-Math.sin(lat) * Math.cos(lon), -Math.sin(lat) * Math.sin(lon), Math.cos(lat)];
  return { u, e, n, hT: heightSmooth(t, t.tx, t.ty) };
}

function buildPositions(t, f, rings, azimuths) {
  const around = azimuths.length;
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
    azimuths.forEach((phi, j) => {
      const dir = [0, 1, 2].map((k) => Math.cos(th) * f.u[k] + Math.sin(th) * (Math.cos(phi) * f.n[k] + Math.sin(phi) * f.e[k]));
      const pl = planeOf(dir[0], dir[1], dir[2]);
      put(1 + (i - 1) * around + j, dir, pl ? heightSmooth(t, pl[0], pl[1]) : 0, rings[i]);
    });
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

/** Normals of the merged field, from each vertex's neighbours across rings and azimuths. */
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

async function shadows(siteId, count, moonPos, sun) {
  const workers = Math.max(1, availableParallelism() - 1);
  const per = Math.ceil(count / workers);
  const parts = await Promise.all(
    Array.from({ length: workers }, (_, w) => {
      const start = w * per;
      const end = Math.min(count, start + per);
      return new Promise((done, fail) => {
        const worker = new Worker(fileURLToPath(import.meta.url), { workerData: { start, end, moonPos: moonPos.buffer, sun, siteId } });
        worker.once('message', (out) => done({ start, out }));
        worker.once('error', fail);
      });
    }),
  );
  const lit = new Float32Array(count);
  for (const { start, out } of parts) lit.set(out, start);
  return lit;
}

const asBuffer = (a) => Buffer.from(a.buffer, a.byteOffset, a.byteLength);
const readF32 = (path) => {
  const b = readFileSync(path);
  return new Float32Array(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
};

/** The geometry from its cache, or built and cached. */
function geometryOf(site, t, f, params, key) {
  const dir = `${CACHE}geometry/`;
  const rings = ringsOf(params.ratio);
  const azimuths = azimuthsOf(params.around, params.sector);
  const n = 1 + (rings.length - 1) * azimuths.length;
  const files = ['moon', 'world', 'normals', 'nm', 'index'].map((x) => `${dir}${key}.${x}`);
  if (files.every(existsSync)) {
    const moonBuf = readFileSync(files[0]);
    const moonPos = new Float64Array(new SharedArrayBuffer(n * 24));
    moonPos.set(new Float64Array(moonBuf.buffer.slice(moonBuf.byteOffset, moonBuf.byteOffset + moonBuf.byteLength)));
    const ib = readFileSync(files[4]);
    return { rings, azimuths, count: n, moonPos, world: readF32(files[1]), normals: readF32(files[2]), nmWeight: readF32(files[3]), indices: new Uint32Array(ib.buffer.slice(ib.byteOffset, ib.byteOffset + ib.byteLength)) };
  }
  const g = buildPositions(t, f, rings, azimuths);
  const normals = buildNormals(g.world, rings, azimuths.length);
  const indices = buildIndices(rings, azimuths.length);
  mkdirSync(dir, { recursive: true });
  [g.moonPos, g.world, normals, g.nmWeight, indices].forEach((a, i) => writeFileSync(files[i], asBuffer(a)));
  return { ...g, rings, azimuths, normals, indices };
}

const tagOf = (iso) => iso.replace(/[-:]/g, '').replace(/\.\d+/, '').replace(/00Z$/, 'Z');

async function main() {
  const site = siteOf();
  const instant = argOf('instant', null);
  const out = argOf('out', null);
  if (!instant || !out) throw new Error('usage: build.mjs --instant ISO --out DIR [--site id] [--around N] [--ratio Q] [--sector HEADING,HALF,N]');
  const sector = argOf('sector', null)?.split(',').map(Number) ?? null;
  const params = { around: Number(argOf('around', 1024)), ratio: Number(argOf('ratio', 1.009)), sector };
  const sky = skyOf(site, instant);
  const t0 = Date.now();
  const seconds = () => ((Date.now() - t0) / 1000).toFixed(1);
  const t = loadField(site);
  const f = frameOf(site, t);
  const fieldKey = JSON.stringify({ site: site.id, field: readFileSync(new URL('../cache/tiles/version.json', import.meta.url), 'utf8'), src: readFileSync(new URL('./field.mjs', import.meta.url), 'utf8').length });
  const key = createHash('sha256').update(fieldKey + JSON.stringify(params)).digest('hex').slice(0, 16);
  const g = geometryOf(site, t, f, params, key);
  process.stdout.write(`${g.rings.length} rings x ${g.azimuths.length} azimuths: ${g.count} vertices, ${seconds()} s\n`);
  const tag = tagOf(sky.instant);
  const shadowPath = `${CACHE}shadows/${key}-${tag}.f32`;
  let lit;
  if (existsSync(shadowPath)) lit = readF32(shadowPath);
  else {
    lit = await shadows(site.id, g.count, g.moonPos, unit(sky.subSolar.latDeg, sky.subSolar.lonEastDeg));
    mkdirSync(`${CACHE}shadows/`, { recursive: true });
    writeFileSync(shadowPath, asBuffer(lit));
  }
  process.stdout.write(`shadows for ${tag}, ${seconds()} s\n`);
  const uv0 = new Float32Array(g.count * 2);
  for (let v = 0; v < g.count; v++) uv0.set([lit[v], g.nmWeight[v]], v * 2);
  const dir = resolve(out);
  mkdirSync(dir, { recursive: true });
  const name = `moon-${site.id}-${tag}`;
  writeGlb(`${dir}/${name}.glb`, { positions: g.world, normals: g.normals, uv0, indices: g.indices });
  const world = {
    site: site.id, instant: sky.instant, mesh: `${name}.glb`,
    groundHeightM: f.hT, radiusM: RADIUS_M, east: f.e, up: f.u, north: f.n,
    sky, build: { rings: g.rings.length, azimuths: g.azimuths.length, ...params, geometry: key },
  };
  writeFileSync(`${dir}/${name}.json`, `${JSON.stringify(world, null, 2)}\n`);
  process.stdout.write(`wrote ${dir}/${name}.glb and .json, ${seconds()} s\n`);
}

if (isMainThread) await main();
else shadowWorker();
