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
 * What the ring route and the tile route answer (VENT-46,
 * docs/terrain-api.md), checked and decoded: the list of tiles a view asks
 * for, and a tile's 16-bit heights as float32 metres over the sphere (NaN
 * where no tier covers). A body that is not one is null, so the source
 * calls it a failure that may pass. Pure.
 */
import { TILE_CELLS, decodeQuantised, type TileScheme } from '@ventana/sim';
import type { RingTile } from './ring-store';

export interface RingEntry {
  readonly level: number;
  readonly x: number;
  readonly y: number;
  readonly url: string;
}

export interface RingList {
  readonly scheme: TileScheme;
  readonly entries: readonly RingEntry[];
}

const SCHEMES: readonly string[] = ['polar-south', 'polar-north', 'latlon'];
const N = TILE_CELLS + 1;
const num = (v: unknown): v is number => typeof v === 'number' &&
  Number.isFinite(v);
type Loose = Record<string, unknown>;

/** The ring list of a route answer, or null. */
export function parseRing(body: unknown): RingList | null {
  const { scheme, levels } = (body ?? {}) as Loose;
  if (typeof scheme !== 'string' || !SCHEMES.includes(scheme)) return null;
  if (!Array.isArray(levels)) return null;
  const entries: RingEntry[] = [];
  for (const row of levels as Loose[]) {
    const tiles = row['tiles'];
    if (!num(row['level']) || !Array.isArray(tiles)) return null;
    for (const t of tiles as Loose[]) {
      if (!num(t['x']) || !num(t['y']) || typeof t['url'] !== 'string') {
        return null;
      }
      entries.push({ level: row['level'], x: t['x'], y: t['y'], url: t['url'] });
    }
  }
  return { scheme: scheme as TileScheme, entries };
}

/** The tile of `entry` in a tile route answer, or null when it is not one. */
export function parseTile(
  body: unknown,
  entry: RingEntry,
  scheme: TileScheme,
): RingTile | null {
  const b = (body ?? {}) as Loose;
  if (b['n'] !== N || typeof b['heights'] !== 'string') return null;
  if (!num(b['quantumM']) || !num(b['baseUnits'])) return null;
  if (!num(b['resolutionM'])) return null;
  try {
    const heights = decodeQuantised(b['heights'], b['quantumM'], b['baseUnits']);
    if (heights.length !== N * N) return null;
    const { level, x, y } = entry;
    return { key: { scheme, level, x, y }, n: N, heights,
      resolutionM: b['resolutionM'] };
  } catch {
    return null;
  }
}
