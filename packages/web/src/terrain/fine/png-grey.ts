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
 * A reader of grey PNGs (VENT-62): the fine tiles' 16-bit heights and 1-bit
 * masks, which an image element or a canvas would reduce to 8 bits. Not
 * interlaced, grey only (colour type 0), which is all the tiles are. The
 * zlib stream is inflated by the browser (`DecompressionStream`).
 */

const SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];

export interface GreyPng {
  readonly width: number;
  readonly height: number;
  readonly bitDepth: 1 | 8 | 16;
  /** One value per pixel, row-major, at the file's depth. */
  readonly samples: Uint16Array;
}

/** Inflates a zlib stream. */
export type Inflate = (zlib: Uint8Array) => Promise<Uint8Array>;

/** The browser's (and Node's) own inflate. */
export const streamInflate: Inflate = async (zlib) => {
  const stream = new Blob([zlib as BlobPart]).stream()
    .pipeThrough(new DecompressionStream('deflate'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
};

interface Chunks {
  readonly header: DataView;
  readonly data: Uint8Array;
}

/** The IHDR and the joined IDAT of `bytes`. */
function chunksOf(bytes: Uint8Array): Chunks {
  if (SIGNATURE.some((b, i) => bytes[i] !== b)) {
    throw new Error('not a PNG');
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.length);
  const parts: Uint8Array[] = [];
  let header: DataView | null = null;
  for (let at = 8; at + 8 <= bytes.length;) {
    const size = view.getUint32(at);
    const type = String.fromCharCode(...bytes.subarray(at + 4, at + 8));
    const body = bytes.subarray(at + 8, at + 8 + size);
    if (type === 'IHDR') {
      header = new DataView(body.buffer, body.byteOffset, body.length);
    } else if (type === 'IDAT') parts.push(body);
    at += 12 + size;
  }
  if (!header) throw new Error('PNG without IHDR');
  const data = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  parts.reduce((at, p) => (data.set(p, at), at + p.length), 0);
  return { header, data };
}

const paeth = (a: number, b: number, c: number): number => {
  const p = a + b - c;
  const [pa, pb, pc] = [Math.abs(p - a), Math.abs(p - b), Math.abs(p - c)];
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
};

/** Undoes the row filters in place; `bpp` is bytes per pixel (min 1). */
function unfilter(
  raw: Uint8Array,
  rowBytes: number,
  rows: number,
  bpp: number,
) {
  const out = new Uint8Array(rowBytes * rows);
  for (let y = 0; y < rows; y++) {
    const type = raw[y * (rowBytes + 1)] ?? 0;
    for (let x = 0; x < rowBytes; x++) {
      const v = raw[y * (rowBytes + 1) + 1 + x] ?? 0;
      const a = x >= bpp ? out[y * rowBytes + x - bpp] ?? 0 : 0;
      const b = y > 0 ? out[(y - 1) * rowBytes + x] ?? 0 : 0;
      const c = y > 0 && x >= bpp
        ? out[(y - 1) * rowBytes + x - bpp] ?? 0 : 0;
      const add = [0, a, b, (a + b) >> 1, paeth(a, b, c)][type] ?? 0;
      out[y * rowBytes + x] = (v + add) & 255;
    }
  }
  return out;
}

/** The pixels of the grey PNG `bytes`. */
export async function decodeGreyPng(
  bytes: Uint8Array,
  inflate: Inflate = streamInflate,
): Promise<GreyPng> {
  const { header, data } = chunksOf(bytes);
  const [width, height] = [header.getUint32(0), header.getUint32(4)];
  const depth = header.getUint8(8);
  if (header.getUint8(9) !== 0 || header.getUint8(12) !== 0 ||
    (depth !== 1 && depth !== 8 && depth !== 16)) {
    throw new Error('PNG: only non-interlaced grey of 1, 8 or 16 bits');
  }
  const rowBytes = Math.ceil((width * depth) / 8);
  const bpp = Math.max(depth / 8, 1);
  const rows = unfilter(await inflate(data), rowBytes, height, bpp);
  const samples = new Uint16Array(width * height);
  for (let i = 0; i < samples.length; i++) {
    const [y, x] = [Math.floor(i / width), i % width];
    const at = y * rowBytes;
    samples[i] = depth === 16
      ? ((rows[at + 2 * x] ?? 0) << 8) | (rows[at + 2 * x + 1] ?? 0)
      : depth === 8 ? rows[at + x] ?? 0
        : ((rows[at + (x >> 3)] ?? 0) >> (7 - (x & 7))) & 1;
  }
  return { width, height, bitDepth: depth, samples };
}
