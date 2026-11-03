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
 * How a ring's tiles are coming (VENT-60): the wanted tiles in the
 * route's order (nearest and finest first), each waiting, landed (with its
 * place in the order of arrival and its heights) or missed (its level
 * settled without it: a hole the parent fills). The on-foot loader reads
 * it to count and to draw the tiles as they land. Immutable, so a store
 * can hand each change to React as a new value. Pure.
 */
import type { TileScheme } from '@ventana/sim';
import type { RingTile } from './ring-store';

export type TileFate = 'waiting' | 'landed' | 'missed';

export interface ProgressTile {
  readonly level: number;
  readonly x: number;
  readonly y: number;
  readonly fate: TileFate;
  /** Place in the order of arrival, from 1; 0 until the tile lands. */
  readonly order: number;
  /** The tile's heights, once it landed. */
  readonly tile: RingTile | null;
}

export interface RingProgress {
  /** The scheme of the route's list; null until the list answered. */
  readonly scheme: TileScheme | null;
  readonly tiles: readonly ProgressTile[];
  /** How many tiles have landed. */
  readonly landed: number;
}

/** Before the route's list has answered. */
export const NOT_LISTED: RingProgress = { scheme: null, tiles: [], landed: 0 };

type Place = Readonly<{ level: number; x: number; y: number }>;

/** The wanted tiles of the route's list, all waiting. */
export function listed(
  scheme: TileScheme,
  wanted: readonly Place[],
): RingProgress {
  const tiles = wanted.map(({ level, x, y }) => ({ level, x, y,
    fate: 'waiting' as const, order: 0, tile: null }));
  return { scheme, tiles, landed: 0 };
}

/** `p` with `tile` landed, next in the order of arrival. */
export function land(p: RingProgress, tile: RingTile): RingProgress {
  const { level, x, y } = tile.key;
  const order = p.landed + 1;
  let found = false;
  const tiles = p.tiles.map((t) => {
    if (t.level !== level || t.x !== x || t.y !== y || t.fate !== 'waiting') {
      return t;
    }
    found = true;
    return { ...t, fate: 'landed' as const, order, tile };
  });
  return found ? { ...p, tiles, landed: order } : p;
}

/** `p` with the tiles of `level` still waiting missed: it settled. */
export function settle(p: RingProgress, level: number): RingProgress {
  const missing = (t: ProgressTile) => t.level === level &&
    t.fate === 'waiting';
  if (!p.tiles.some(missing)) return p;
  const tiles = p.tiles.map((t) => (missing(t)
    ? { ...t, fate: 'missed' as const } : t));
  return { ...p, tiles };
}

/**
 * Of the tiles of levels `from` up to (not including) `to`: how many have
 * come or failed for good, and how many there are.
 */
export function tally(
  p: RingProgress,
  from: number,
  to: number,
): { done: number; total: number } {
  const some = p.tiles.filter((t) => t.level >= from && t.level < to);
  const done = some.filter((t) => t.fate !== 'waiting').length;
  return { done, total: some.length };
}
