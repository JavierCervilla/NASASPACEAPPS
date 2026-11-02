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
 * Where a custom point's terrain horizon comes from (VENT-40): the API's
 * `/api/v1/horizon?lat&lon`, a sibling of the sites endpoint like the
 * point's ephemeris (pin/point-hours.ts). Its answer carries the profile
 * and the grids that served the rays, finest first, so the caption can
 * name the resolution the horizon was seen at. Pure but for the fetch,
 * which is injected.
 */
import { decodeProfile, type HorizonProfile } from '@ventana/sim';
import type { LatLon } from '../lib/polar-projection';
import { snapPoint } from '../pin/custom-point';
import { failureOf, TransientHorizonError } from './horizon-errors';

export {
  NoTerrainHereError,
  TerrainNotInstalledError,
  TransientHorizonError,
} from './horizon-errors';

/** A terrain horizon and the finest grid it was read from, metres. */
export interface KnownHorizon {
  readonly profile: HorizonProfile;
  readonly resolutionM: number;
}

/** The sites endpoint's sibling for any point's horizon. */
const SITES_PATH = /\/sites$/;

/**
 * The URL of `point`'s horizon, on the server's 0.01° grid, its longitude
 * wrapped to -180..180 (which the API accepts), so one point has one URL.
 */
export function pointHorizonUrl(sitesUrl: string, point: LatLon): string {
  const at = snapPoint(point) ?? point;
  const query = new URLSearchParams({
    lat: at.lat.toFixed(2),
    lon: at.lonEast.toFixed(2),
  });
  return `${sitesUrl.replace(SITES_PATH, '/horizon')}?${query.toString()}`;
}

interface Answer {
  readonly profile?: unknown;
  readonly tiers?: readonly { readonly resolutionM?: unknown }[];
}

/**
 * The horizon in the API's answer, or null when it is not one: a
 * profile that does not decode, or no grid with a resolution.
 */
export function horizonOf(body: unknown): KnownHorizon | null {
  const { profile, tiers } = (body ?? {}) as Answer;
  const resolutionM = Array.isArray(tiers) ? tiers[0]?.resolutionM : null;
  if (typeof profile !== 'string' || typeof resolutionM !== 'number') {
    return null;
  }
  try {
    return { profile: decodeProfile(profile), resolutionM };
  } catch {
    return null;
  }
}

/**
 * Fetches a point's horizon; rejects when there is none to show, with an
 * error that says whether asking again may help (horizon-errors.ts).
 */
export type HorizonFetch = (point: LatLon) => Promise<KnownHorizon>;

/** A {@link HorizonFetch} over `fetch` against the sites endpoint. */
export function horizonFetch(
  fetcher: typeof fetch,
  sitesUrl: string,
): HorizonFetch {
  return async (point) => {
    const response = await fetcher(pointHorizonUrl(sitesUrl, point)).catch(
      (error: unknown) => {
        throw new TransientHorizonError(null, `horizon: ${String(error)}`);
      },
    );
    if (!response.ok) throw await failureOf(response);
    // A page in place of the answer (a captive portal, a proxy) may pass.
    const known = horizonOf(await response.json().catch(() => null));
    if (!known) throw new TransientHorizonError(null, 'horizon: not a profile');
    return known;
  };
}
