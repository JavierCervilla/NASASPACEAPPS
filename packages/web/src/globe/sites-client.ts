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
 * Loads the landing sites from the API at runtime. Without the API (a local
 * preview, the e2e run, an outage) the globe still works with no markers, so
 * a failure is one console warning, never an error.
 */
import { isSiteId, tooLarge } from '../lib/api-limits';
import type { GlobeSite } from './markers';

export interface SitesSource {
  readonly fetch: typeof fetch;
  /** Same origin in production: `/api/v1/sites`. */
  readonly url: string;
  readonly warn: (message: string) => void;
}

/** Response limits: the list and each name are cut beyond these. */
const MAX_SITES = 500;
const MAX_NAME_CHARS = 120;
/** Why a 200 with a malformed body brings no sites. */
const SHAPE = 'the body was not the expected { sites: [...] } shape';

function isGlobeSite(value: unknown): value is GlobeSite {
  const v = value as Partial<Record<keyof GlobeSite, unknown>> | null;
  return (
    typeof v === 'object' &&
    v !== null &&
    isSiteId(v.id) &&
    typeof v.name === 'string' &&
    Number.isFinite(v.lat) &&
    Number.isFinite(v.lonEast) &&
    typeof v.approximate === 'boolean'
  );
}

/**
 * The sites of an API body (`{ sites: Site[] }`), or null if malformed (a
 * site id outside the allowlist included). At most {@link MAX_SITES} are
 * kept, each name cut to {@link MAX_NAME_CHARS}.
 */
export function parseSiteList(body: unknown): GlobeSite[] | null {
  const all = (body as { sites?: unknown } | null)?.sites;
  if (!Array.isArray(all)) return null;
  const sites: unknown[] = all.slice(0, MAX_SITES);
  if (!sites.every(isGlobeSite)) return null;
  return sites.map(({ id, name, lat, lonEast, approximate }) => ({
    id,
    name: name.slice(0, MAX_NAME_CHARS),
    lat,
    lonEast,
    approximate,
  }));
}

/** The sites, or an empty list after one warning when they cannot load. */
export async function loadSites(source: SitesSource): Promise<GlobeSite[]> {
  try {
    const response = await source.fetch(source.url, {
      headers: { accept: 'application/json' },
    });
    if (!response.ok) return noSites(source, `HTTP ${response.status}`);
    if (tooLarge(response)) return noSites(source, 'the body is too large');
    const body: unknown = await response.json().catch(() => null);
    return parseSiteList(body) ?? noSites(source, SHAPE);
  } catch (error) {
    return noSites(source, String(error));
  }
}

/** Warns once that the globe shows no sites, and why; the empty list. */
function noSites(source: SitesSource, reason: string): GlobeSite[] {
  source.warn(`Ventana Lunar: no landing sites from ${source.url} (${reason}); the globe shows none.`);
  return [];
}
