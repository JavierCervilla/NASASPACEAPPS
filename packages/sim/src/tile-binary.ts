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
 * A levelled tile in binary (VENT-98), the tile route's `format=bin` answer
 * (docs/terrain-api.md): the header of `tile-binary-header.ts`, then the
 * `n * n` residuals of the 2D predictor (`tile-predict.ts`) as two byte
 * planes, every low byte first, then every high byte, rows from north and
 * columns from west. Splitting the planes puts the many zero high bytes of
 * small residuals together, which gzip shrinks to almost nothing. Exact
 * both ways. Pure, no `JSON.parse` or base64.
 */
import {
  TILE_BINARY_HEADER_BYTES, readHeader, writeHeader, type TileHeader,
} from './tile-binary-header.ts';
import { predictResiduals, restoreHeights } from './tile-predict.ts';

export { TILE_BINARY_HEADER_BYTES } from './tile-binary-header.ts';

/** A tile's fields and its 16-bit values (`tile-quant.ts`). */
export interface BinaryTile extends TileHeader {
  /** `n * n` values: height `(baseUnits + q) * quantumM`; 65535 no data. */
  readonly q: Uint16Array;
}

/** `tile` as bytes. @throws RangeError on a bad version token or size. */
export function encodeTileBinary(tile: BinaryTile): Uint8Array<ArrayBuffer> {
  const { n, q } = tile;
  if (q.length !== n * n) throw new RangeError('q is not n x n');
  const residuals = predictResiduals(q, n);
  const bytes = new Uint8Array(TILE_BINARY_HEADER_BYTES + 2 * q.length);
  writeHeader(new DataView(bytes.buffer), tile);
  const low = TILE_BINARY_HEADER_BYTES;
  const high = low + q.length;
  residuals.forEach((r, i) => {
    bytes[low + i] = r & 0xff;
    bytes[high + i] = r >>> 8;
  });
  return bytes;
}

/** The tile in `bytes`. @throws RangeError when they are not one. */
export function decodeTileBinary(bytes: Uint8Array): BinaryTile {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const header = readHeader(view);
  const count = header.n * header.n;
  if (count === 0 || bytes.length !== TILE_BINARY_HEADER_BYTES + 2 * count) {
    throw new RangeError('the heights are not n x n');
  }
  const low = TILE_BINARY_HEADER_BYTES;
  const high = low + count;
  const residuals = new Uint16Array(count);
  for (let i = 0; i < count; i++) {
    const [lo, hi] = [bytes[low + i] as number, bytes[high + i] as number];
    residuals[i] = lo | (hi << 8);
  }
  return { ...header, q: restoreHeights(residuals, header.n) };
}
