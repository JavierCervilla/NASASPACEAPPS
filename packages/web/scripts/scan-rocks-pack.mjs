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

// The scanned rocks' binary (VENT-124), pure: each mesh turned onto its principal axes (longest east, shortest up),
// centred on its box and scaled so its longest half-extent is 1, its normals taken over welded positions (so a UV seam
// shows no crease), then quantised: int16 positions, int8 normals, uint16 UVs and indices. The scene reads it with
// typed-array views and normalised attributes, no decoder (src/terrain/scan-rock-file.ts holds the layout's twin).
// Layout, little endian: 'VRK1', u32 shapes; per shape u32 vertices, u32 indices, f32 half-height, f32 half-depth,
// then positions (3 x int16), normals (4 x int8), UVs (2 x uint16) and indices (uint16), each block padded to 4 bytes.

export const MAGIC = 0x314b5256; // 'VRK1'

/** Eigenvectors of a symmetric 3x3 matrix by Jacobi rotations, as columns, eigenvalues falling. */
export function principalAxes(m) {
  const a = m.map((row) => [...row]);
  const v = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  for (let sweep = 0; sweep < 50; sweep++) {
    for (const [p, q] of [[0, 1], [0, 2], [1, 2]]) {
      if (Math.abs(a[p][q]) < 1e-18) continue;
      const theta = (a[q][q] - a[p][p]) / (2 * a[p][q]);
      const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.hypot(theta, 1));
      const [c, s] = [1 / Math.hypot(t, 1), t / Math.hypot(t, 1)];
      for (let k = 0; k < 3; k++) {
        const [akp, akq] = [a[k][p], a[k][q]];
        [a[k][p], a[k][q]] = [c * akp - s * akq, s * akp + c * akq];
      }
      for (let k = 0; k < 3; k++) {
        const [apk, aqk] = [a[p][k], a[q][k]];
        [a[p][k], a[q][k]] = [c * apk - s * aqk, s * apk + c * aqk];
      }
      for (let k = 0; k < 3; k++) {
        const [vkp, vkq] = [v[k][p], v[k][q]];
        [v[k][p], v[k][q]] = [c * vkp - s * vkq, s * vkp + c * vkq];
      }
    }
  }
  const order = [0, 1, 2].sort((i, j) => a[j][j] - a[i][i]);
  return order.map((i) => {
    const axis = [v[0][i], v[1][i], v[2][i]];
    const big = axis.reduce((b, x) => (Math.abs(x) > Math.abs(b) ? x : b), 0);
    return axis.map((x) => x * Math.sign(big));
  });
}

const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/** The covariance of `positions` about their mean. */
function covariance(positions) {
  const n = positions.length / 3;
  const mean = [0, 1, 2].map((k) => positions.filter((_, i) => i % 3 === k).reduce((s, x) => s + x, 0) / n);
  const m = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  for (let i = 0; i < positions.length; i += 3) {
    const d = [0, 1, 2].map((k) => positions[i + k] - mean[k]);
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) m[r][c] += (d[r] * d[c]) / n;
  }
  return m;
}

/**
 * `positions` in the rock's frame: x the longest axis, y the shortest (up), z the middle one, right handed so the
 * winding holds; centred on the box and scaled so x's half-extent is 1. Returns the half-extents too.
 */
export function normalised(positions) {
  const [long, mid, short] = principalAxes(covariance(positions));
  const zAxis = dot(cross(long, short), mid) > 0 ? mid : mid.map((x) => -x);
  const axes = [long, short, zAxis];
  const out = new Float32Array(positions.length);
  for (let i = 0; i < positions.length; i += 3) {
    const p = [positions[i], positions[i + 1], positions[i + 2]];
    out.set(axes.map((axis) => dot(axis, p)), i);
  }
  const lo = [0, 1, 2].map((k) => Math.min(...out.filter((_, i) => i % 3 === k)));
  const hi = [0, 1, 2].map((k) => Math.max(...out.filter((_, i) => i % 3 === k)));
  const half = [0, 1, 2].map((k) => (hi[k] - lo[k]) / 2);
  for (let i = 0; i < out.length; i++) out[i] = (out[i] - (lo[i % 3] + half[i % 3])) / half[0];
  return { positions: out, half: half.map((h) => h / half[0]) };
}

/** Area-weighted normals, summed over vertices that share a position. */
export function weldedNormals(positions, index) {
  const key = (v) => `${positions[v * 3]},${positions[v * 3 + 1]},${positions[v * 3 + 2]}`;
  const sums = new Map();
  for (let t = 0; t < index.length; t += 3) {
    const [a, b, c] = [index[t], index[t + 1], index[t + 2]].map((v) => [0, 1, 2].map((k) => positions[v * 3 + k]));
    const n = cross(b.map((x, k) => x - a[k]), c.map((x, k) => x - a[k]));
    for (const v of [index[t], index[t + 1], index[t + 2]]) {
      const s = sums.get(key(v)) ?? [0, 0, 0];
      sums.set(key(v), s.map((x, k) => x + n[k]));
    }
  }
  const out = new Float32Array(positions.length);
  for (let v = 0; v < positions.length / 3; v++) {
    const s = sums.get(key(v)) ?? [0, 1, 0];
    const len = Math.hypot(...s) || 1;
    out.set(s.map((x) => x / len), v * 3);
  }
  return out;
}

const pad4 = (n) => (n + 3) & ~3;
const clampQ = (x, max) => Math.round(Math.max(-1, Math.min(1, x)) * max);

/** One shape's block. */
function shapeBlock(shape) {
  const nv = shape.positions.length / 3;
  const ni = shape.index.length;
  const sizes = [16, pad4(nv * 6), nv * 4, nv * 4, pad4(ni * 2)];
  const buffer = new ArrayBuffer(sizes.reduce((s, x) => s + x, 0));
  const view = new DataView(buffer);
  view.setUint32(0, nv, true);
  view.setUint32(4, ni, true);
  view.setFloat32(8, shape.half[1], true);
  view.setFloat32(12, shape.half[2], true);
  let at = 16;
  shape.positions.forEach((x, i) => view.setInt16(at + i * 2, clampQ(x, 32767), true));
  at += sizes[1];
  shape.normals.forEach((x, i) => view.setInt8(at + Math.floor(i / 3) * 4 + (i % 3), clampQ(x, 127)));
  at += sizes[2];
  shape.uvs.forEach((x, i) => view.setUint16(at + i * 2, Math.round(Math.max(0, Math.min(1, x)) * 65535), true));
  at += sizes[3];
  shape.index.forEach((x, i) => view.setUint16(at + i * 2, x, true));
  return new Uint8Array(buffer);
}

/** The binary of `meshes` ({positions, uvs, index}) and each shape as stored, before quantising. */
export function packShapes(meshes) {
  const shapes = meshes.map((mesh) => {
    const { positions, half } = normalised(mesh.positions);
    return { positions, half, uvs: mesh.uvs, index: mesh.index, normals: weldedNormals(positions, mesh.index) };
  });
  const head = new Uint8Array(8);
  new DataView(head.buffer).setUint32(0, MAGIC, true);
  new DataView(head.buffer).setUint32(4, shapes.length, true);
  const blocks = [head, ...shapes.map(shapeBlock)];
  const bytes = new Uint8Array(blocks.reduce((s, b) => s + b.length, 0));
  blocks.reduce((at, b) => (bytes.set(b, at), at + b.length), 0);
  return { bytes, shapes };
}
