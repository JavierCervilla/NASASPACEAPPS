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
 * The scanned rocks' binary (VENT-124), written offline by
 * `scripts/scan-rocks-pack.mjs`: each shape's quantised vertices and
 * triangles, read here as typed-array views over the file, no copy and no
 * decoder. Little endian: 'VRK1', u32 shapes; per shape u32 vertices, u32
 * indices, f32 half-height, f32 half-depth, then positions (3 x int16),
 * normals (4 x int8), UVs (2 x uint16), indices (uint16), each block padded
 * to 4 bytes. Pure.
 */

export const SCAN_MAGIC = 0x314b5256;

/** One scan in its unit frame: x the long axis, half-extent 1; y up. */
export interface ScanShape {
  /** Normalised to [-1, 1]. */
  readonly positions: Int16Array;
  /** Normalised, 4 per vertex, the 4th unused. */
  readonly normals: Int8Array;
  /** Normalised to [0, 1]. */
  readonly uvs: Uint16Array;
  readonly index: Uint16Array;
  readonly halfHeight: number;
  readonly halfDepth: number;
}

const pad4 = (n: number): number => (n + 3) & ~3;

/** The shape whose block starts at `at`, and where the next one starts. */
function shapeAt(buffer: ArrayBuffer, at: number) {
  const view = new DataView(buffer);
  const nv = view.getUint32(at, true);
  const ni = view.getUint32(at + 4, true);
  let next = at + 16;
  const take = <T>(make: (start: number) => T, bytes: number): T => {
    const out = make(next);
    next += pad4(bytes);
    return out;
  };
  const shape: ScanShape = {
    halfHeight: view.getFloat32(at + 8, true),
    halfDepth: view.getFloat32(at + 12, true),
    positions: take((s) => new Int16Array(buffer, s, nv * 3), nv * 6),
    normals: take((s) => new Int8Array(buffer, s, nv * 4), nv * 4),
    uvs: take((s) => new Uint16Array(buffer, s, nv * 2), nv * 4),
    index: take((s) => new Uint16Array(buffer, s, ni), ni * 2),
  };
  return { shape, next };
}

/**
 * Every shape in `buffer`; throws when it is not the scans' file or holds
 * no shape, which the view takes as a failed load (the stones stand in).
 */
export function readScanShapes(buffer: ArrayBuffer): ScanShape[] {
  const view = new DataView(buffer);
  if (buffer.byteLength < 8 || view.getUint32(0, true) !== SCAN_MAGIC) {
    throw new Error('not a scanned rocks file');
  }
  if (view.getUint32(4, true) === 0) {
    throw new Error('the scanned rocks file holds no shape');
  }
  const shapes: ScanShape[] = [];
  for (let i = 0, at = 8; i < view.getUint32(4, true); i++) {
    const { shape, next } = shapeAt(buffer, at);
    shapes.push(shape);
    at = next;
  }
  return shapes;
}
