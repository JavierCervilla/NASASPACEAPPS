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
 * The checked parameters of the levelled tile routes (VENT-46): a tile key
 * from the path, a point and a number of levels for the ring, and the
 * version token a url carries.
 */
import {
  DEFAULT_LEVELS,
  TILE_LEVELS,
  isTileKey,
  type TileKey,
  type TileScheme,
} from '@ventana/sim';
import { ParamError, numberParam } from '../param-values.ts';
import { roundToGrid } from '../params.ts';

const SCHEMES: readonly TileScheme[] = ['polar-south', 'polar-north', 'latlon'];
const WHOLE = /^-?\d{1,9}$/;
const TOKEN = /^[0-9a-f]{8}$/;

/** How a tile is sent: `json` (base64 heights) or `bin` (VENT-98). */
export type TileFormat = 'json' | 'bin';

/** The raw path of a tile. */
export interface RawTileKey {
  readonly scheme?: string | undefined;
  readonly level?: string | undefined;
  readonly x?: string | undefined;
  readonly y?: string | undefined;
}

/** The raw query of the ring route. */
export interface RawIndexParams {
  readonly lat?: string | undefined;
  readonly lon?: string | undefined;
  readonly levels?: string | undefined;
  readonly format?: string | undefined;
}

/** The checked ring request: the point on the 0.01° grid, and the levels. */
export interface IndexParams {
  readonly lat: number;
  readonly lonEast: number;
  readonly levels: number;
  /**
   * The tiles' format: `bin` only when asked for it; any other value lists
   * JSON urls, as a server without binary tiles does (VENT-98).
   */
  readonly format: TileFormat;
}

function wholeParam(name: string, raw: string | undefined): number {
  if (raw === undefined || !WHOLE.test(raw)) {
    throw new ParamError(`"${name}" must be a whole number`);
  }
  return Number(raw);
}

/**
 * The checked key of a tile request.
 *
 * @throws ParamError naming the first invalid parameter.
 */
export function parseTileKey(raw: RawTileKey): TileKey {
  const scheme = SCHEMES.find((s) => s === raw.scheme);
  if (scheme === undefined) {
    throw new ParamError(`"scheme" must be one of ${SCHEMES.join(', ')}`);
  }
  const level = wholeParam('level', raw.level);
  const key = { scheme, level, x: wholeParam('x', raw.x), y: wholeParam('y', raw.y) };
  if (!isTileKey(key)) {
    throw new ParamError('the tile is outside the grid of its scheme and level');
  }
  return key;
}

/**
 * The checked ring request.
 *
 * @throws ParamError naming the first invalid parameter.
 */
export function parseIndexParams(raw: RawIndexParams): IndexParams {
  const lat = roundToGrid(numberParam('lat', raw.lat, -90, 90));
  const lonEast = roundToGrid(numberParam('lon', raw.lon, -180, 360));
  const levels =
    raw.levels === undefined ? DEFAULT_LEVELS : wholeParam('levels', raw.levels);
  if (levels < 1 || levels > TILE_LEVELS) {
    throw new ParamError(`"levels" must be a whole number from 1 to ${TILE_LEVELS}`);
  }
  const format = raw.format === 'bin' ? 'bin' : 'json';
  return { lat, lonEast, levels, format };
}

/**
 * The version token of a tile url's `v`, or undefined without one.
 *
 * @throws ParamError when it is not eight hex digits.
 */
export function parseVersion(raw: string | undefined): string | undefined {
  if (raw === undefined) return undefined;
  if (!TOKEN.test(raw)) throw new ParamError('"v" must be a version token');
  return raw;
}

/**
 * The format a tile url's `format` asks for: JSON without one.
 *
 * @throws ParamError for any other value than `bin`.
 */
export function parseFormat(raw: string | undefined): TileFormat {
  if (raw === undefined) return 'json';
  if (raw !== 'bin') throw new ParamError('"format" must be bin');
  return raw;
}
