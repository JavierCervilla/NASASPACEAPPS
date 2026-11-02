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
 * The view's tiles from the API (VENT-34): a {@link TileSource} over
 * `fetch`, its failures classified as the horizon's (VENT-45,
 * horizon-errors.ts), and the tries a view makes: a failure that may pass
 * (the network, a busy 503, a 429, another 5xx) is asked again after the
 * horizon's waits; a 404 and a server with no terrain are answers.
 */
import type { LatLon } from '../lib/polar-projection';
import {
  NoTerrainHereError,
  TerrainNotInstalledError,
  TransientHorizonError,
  failureOf,
} from '../horizon/horizon-errors';
import {
  HORIZON_RETRY,
  retryDelayMs,
  type RetryPolicy,
  type Waits,
} from '../horizon/horizon-retry';
import { tileOf, tileUrl, type HeightTile, type TileSource } from './tile';

/** What a view knows of its tile. */
export type TileState =
  | { readonly kind: 'loading' }
  | { readonly kind: 'tile'; readonly tile: HeightTile }
  /** No terrain covers the point on this server: final. */
  | { readonly kind: 'noTerrain' }
  /** The server has no terrain installed yet (VENT-43). */
  | { readonly kind: 'notInstalled' }
  /** The tries ran out on failures that may pass: «Try again». */
  | { readonly kind: 'unavailable' };

/** A {@link TileSource} over `fetcher` against the sites endpoint. */
export function fetchTileSource(
  fetcher: typeof fetch,
  sitesUrl: string,
): TileSource {
  return {
    get: async (point, sizeM) => {
      const url = tileUrl(sitesUrl, point, sizeM);
      const response = await fetcher(url).catch((error: unknown) => {
        throw new TransientHorizonError(null, `tile: ${String(error)}`);
      });
      if (!response.ok) throw await failureOf(response);
      const tile = tileOf(await response.json().catch(() => null));
      if (!tile) throw new TransientHorizonError(null, 'tile: not a tile');
      return tile;
    },
  };
}

/** What a final `error` leaves the view. */
function settled(error: unknown): TileState {
  if (error instanceof NoTerrainHereError) return { kind: 'noTerrain' };
  if (error instanceof TerrainNotInstalledError) {
    return { kind: 'notInstalled' };
  }
  return { kind: 'unavailable' };
}

export interface TileAsk {
  readonly source: TileSource;
  readonly point: LatLon;
  readonly sizeM: number;
}

/** Asks for a tile until it comes, fails for good or the tries run out. */
export async function askTile(
  { source, point, sizeM }: TileAsk,
  waits: Waits,
  policy: RetryPolicy = HORIZON_RETRY,
): Promise<TileState> {
  for (let failures = 0; ; failures++) {
    try {
      return { kind: 'tile', tile: await source.get(point, sizeM) };
    } catch (error) {
      const wait = retryDelayMs(error, failures, policy, waits.random);
      if (wait === null) return settled(error);
      await waits.sleep(wait);
    }
  }
}
