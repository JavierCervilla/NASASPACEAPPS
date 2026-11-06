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
 * The fixed header of the binary tile (VENT-98), 68 bytes, little-endian:
 *
 * | Offset | Type | Field |
 * |---|---|---|
 * | 0 | 4 bytes | magic `VLTB` |
 * | 4 | uint8 | format, 1 |
 * | 5 | uint8 | scheme: 0 polar-south, 1 polar-north, 2 latlon |
 * | 6 | uint8 | level |
 * | 7 | uint8 | predictor: 1, the gradient (`tile-predict.ts`) |
 * | 8, 12 | int32 | x, y |
 * | 16 | uint16 | n, samples a side |
 * | 18 | uint16 | noData, 65535 |
 * | 20 | int32 | baseUnits |
 * | 24 | float64 | quantumM |
 * | 32, 40, 48 | float64 | resolutionM, minM, maxM |
 * | 56 | float64 | coverage |
 * | 64 | uint32 | the version token's eight hex digits |
 *
 * The georeference is not repeated: it is `tileGeoref` of the key. Pure.
 */
import { isTileKey } from './tile-key.ts';
import { NO_DATA } from './tile-quant.ts';
import type { TileKey, TileScheme } from './tile-scheme.ts';

export const TILE_BINARY_HEADER_BYTES = 68;
const MAGIC = [0x56, 0x4c, 0x54, 0x42];
const FORMAT = 1;
const GRADIENT = 1;
const SCHEMES: readonly TileScheme[] = ['polar-south', 'polar-north', 'latlon'];
const TOKEN = /^[0-9a-f]{8}$/;

/** What the header says, with the 16-bit values left out. */
export interface TileHeader {
  readonly version: string;
  readonly key: TileKey;
  readonly n: number;
  readonly quantumM: number;
  readonly baseUnits: number;
  readonly resolutionM: number;
  readonly minM: number;
  readonly maxM: number;
  readonly coverage: number;
}

/** Writes `h` at the start of `view`. @throws RangeError on a bad token. */
export function writeHeader(view: DataView, h: TileHeader): void {
  if (!TOKEN.test(h.version)) throw new RangeError('not a version token');
  MAGIC.forEach((b, i) => view.setUint8(i, b));
  const { scheme, level, x, y } = h.key;
  [FORMAT, SCHEMES.indexOf(scheme), level, GRADIENT]
    .forEach((b, i) => view.setUint8(4 + i, b));
  view.setInt32(8, x, true);
  view.setInt32(12, y, true);
  view.setUint16(16, h.n, true);
  view.setUint16(18, NO_DATA, true);
  view.setInt32(20, h.baseUnits, true);
  [h.quantumM, h.resolutionM, h.minM, h.maxM, h.coverage]
    .forEach((v, i) => view.setFloat64(24 + i * 8, v, true));
  view.setUint32(64, Number.parseInt(h.version, 16), true);
}

/** The key the header names. @throws RangeError when it is not one. */
function keyOf(view: DataView): TileKey {
  const scheme = SCHEMES[view.getUint8(5)];
  const key = scheme && {
    scheme, level: view.getUint8(6),
    x: view.getInt32(8, true), y: view.getInt32(12, true),
  };
  if (!key || !isTileKey(key)) throw new RangeError('not a tile key');
  return key;
}

/** The header at the start of `view`. @throws RangeError when not one. */
export function readHeader(view: DataView): TileHeader {
  if (view.byteLength < TILE_BINARY_HEADER_BYTES
    || MAGIC.some((b, i) => view.getUint8(i) !== b)
    || view.getUint8(4) !== FORMAT || view.getUint8(7) !== GRADIENT
    || view.getUint16(18, true) !== NO_DATA) {
    throw new RangeError('not a binary tile');
  }
  const [quantumM, resolutionM, minM, maxM, coverage] = [0, 1, 2, 3, 4]
    .map((i) => view.getFloat64(24 + i * 8, true)) as number[];
  return {
    version: view.getUint32(64, true).toString(16).padStart(8, '0'),
    key: keyOf(view), n: view.getUint16(16, true),
    quantumM: quantumM as number, baseUnits: view.getInt32(20, true),
    resolutionM: resolutionM as number, minM: minM as number,
    maxM: maxM as number, coverage: coverage as number,
  };
}
