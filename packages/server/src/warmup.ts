/**
 * Cache warm-up: on start the server asks Horizons, in the background, for the
 * default range of every curated site, so the first visitor of a site reads the
 * disk cache instead of waiting for Horizons.
 */
import type { Site } from '@ventana/sim';
import { ephemerisQueries } from './ephemeris-queries.ts';
import { cacheKey, type HorizonsClient } from './horizons/client.ts';
import { toHorizonsParams, type HorizonsQuery } from './horizons/query.ts';
import { mapLimited } from './map-limited.ts';
import { parseEphemerisParams } from './params.ts';

/**
 * Range warmed for every site. November and December 2026 hold the hackathon
 * (14-15 November) and the weeks after it, which is what the jury and the first
 * visitors look at; it is also the range of the recorded test fixtures.
 */
export const WARM_FROM = '2026-11-01';
export const WARM_TO = '2026-12-31';

// Horizons calls in flight at once during the warm-up: the same courtesy limit
// as one visitor request. Two at a time: four made Horizons answer 503 to part
// of the warm-up in production (2026-10-29).
const WARM_CONCURRENCY = 2;

/**
 * What the warm-up needs; `log` receives one line per failed request and the
 * final summary.
 */
export interface WarmUpDeps {
  readonly horizons: HorizonsClient;
  readonly sites: readonly Site[];
  readonly log: (line: string) => void;
  readonly from?: string;
  readonly to?: string;
}

/**
 * Outcome of a warm-up: distinct Horizons requests sent and how many of them
 * failed.
 */
export interface WarmUpResult {
  readonly requests: number;
  readonly failed: number;
}

/**
 * The distinct Horizons requests behind every site over the warm range, built
 * exactly as the site route builds them.
 */
function uniqueQueries(deps: WarmUpDeps): HorizonsQuery[] {
  const unique = new Map<string, HorizonsQuery>();
  const range = { from: deps.from ?? WARM_FROM, to: deps.to ?? WARM_TO };
  for (const site of deps.sites) {
    const raw = { lat: String(site.lat), lon: String(site.lonEast), ...range };
    // `now` only sets the reference hour of the metrics, which the warm-up does
    // not use.
    for (const query of ephemerisQueries(parseEphemerisParams(raw, 0))) {
      unique.set(cacheKey(toHorizonsParams(query)), query);
    }
  }
  return [...unique.values()];
}

/** Fetches one table into the cache; `false` (and a log line) on failure. */
async function warmOne(
  deps: WarmUpDeps,
  query: HorizonsQuery,
): Promise<boolean> {
  try {
    // Every table here is a DSN table or belongs to a curated site, so all of
    // them are pinned.
    await deps.horizons.rows(query, { pinned: true });
    return true;
  } catch (error) {
    const { target, point, start } = query;
    deps.log(
      `warm-up: ${target} from ${point.lat},${point.lonEast} ${start}: ${(error as Error).message}`,
    );
    return false;
  }
}

/**
 * Fetches, through the client (and so into its disk cache), every Horizons
 * table the API needs to answer each site over the warm range. The requests are
 * built exactly as the site route builds them (same rounding, same months), so
 * they land on the cache entries a visitor will read. Requests shared by
 * several sites (the DSN tables, sites with the same stand-in point) are sent
 * once. Never rejects: a failed request is logged and counted, and the visitor
 * who needs it later simply triggers it again.
 */
export async function warmCache(deps: WarmUpDeps): Promise<WarmUpResult> {
  const queries = uniqueQueries(deps);
  const outcomes = await mapLimited(queries, WARM_CONCURRENCY, (query) =>
    warmOne(deps, query),
  );
  const failed = outcomes.filter((ok) => !ok).length;
  const result = { requests: outcomes.length, failed };
  deps.log(
    `warm-up: ${result.requests - failed} of ${result.requests} Horizons tables cached`,
  );
  return result;
}
