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
 * Reads a greyscale PNG (bit depth 1, 8 or 16, not interlaced) into a
 * Uint16Array of its samples, as the app's fine tiles store their heights
 * (16-bit) and masks (1-bit). Enough PNG for those files, no more.
 */
import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

function unfilter(raw, rows, stride, bpp) {
  const out = Buffer.alloc(rows * stride);
  for (let r = 0; r < rows; r++) {
    const type = raw[r * (stride + 1)];
    const line = raw.subarray(r * (stride + 1) + 1, (r + 1) * (stride + 1));
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? out[r * stride + i - bpp] : 0;
      const b = r > 0 ? out[(r - 1) * stride + i] : 0;
      const c = r > 0 && i >= bpp ? out[(r - 1) * stride + i - bpp] : 0;
      const pred = [0, a, b, (a + b) >> 1, paeth(a, b, c)][type];
      out[r * stride + i] = (line[i] + pred) & 0xff;
    }
  }
  return out;
}

/** { width, height, data: Uint16Array } of a greyscale PNG file. */
export function readGreyPng(path) {
  const buf = readFileSync(path);
  let width = 0;
  let height = 0;
  let depth = 0;
  const idat = [];
  for (let at = 8; at < buf.length; ) {
    const len = buf.readUInt32BE(at);
    const kind = buf.toString('latin1', at + 4, at + 8);
    const body = buf.subarray(at + 8, at + 8 + len);
    if (kind === 'IHDR') {
      width = body.readUInt32BE(0);
      height = body.readUInt32BE(4);
      depth = body[8];
      if (body[9] !== 0 || body[12] !== 0) throw new Error(`${path}: only non-interlaced greyscale PNG`);
    } else if (kind === 'IDAT') idat.push(body);
    at += 12 + len;
  }
  const stride = Math.ceil((width * depth) / 8);
  const px = unfilter(inflateSync(Buffer.concat(idat)), height, stride, Math.max(1, depth / 8));
  const data = new Uint16Array(width * height);
  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      const i = r * stride;
      if (depth === 16) data[r * width + c] = px.readUInt16BE(i + c * 2);
      else if (depth === 8) data[r * width + c] = px[i + c];
      else data[r * width + c] = (px[i + (c >> 3)] >> (7 - (c & 7))) & 1;
    }
  }
  return { width, height, data };
}
