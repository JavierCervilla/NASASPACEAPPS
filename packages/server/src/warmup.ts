/**
 * Cache warm-up: on start the server asks Horizons, in the background, for the
 * default range of every curated site, so the first visitor of a site reads the
 * disk cache instead of waiting for Horizons.
 */
import type { Site } from '@ventana/sim';
import { ephemerisQueries } from './ephemeris-queries.ts';
import {
  HorizonsError,
  cacheKey,
  type HorizonsClient,
} from './horizons/client.ts';
import { realSleep } from './horizons/fetch.ts';
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
 * Retries of a table the download queue refused as busy (visitors filled it),
 * and the wait before each: the queue drains in seconds.
 */
export const WARM_BUSY_RETRIES = 3;
export const WARM_BUSY_DELAY_MS = 10_000;

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
  /** Waits before retrying a busy table; a test passes one that records. */
  readonly sleep?: (ms: number) => Promise<void>;
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

function isBusy(error: unknown): boolean {
  return error instanceof HorizonsError && error.kind === 'busy';
}

/** Fetches one table, retrying it while the download queue is busy. */
async function fetchRetryingBusy(
  deps: WarmUpDeps,
  query: HorizonsQuery,
): Promise<void> {
  const sleep = deps.sleep ?? realSleep;
  for (let retry = 0; ; retry++) {
    try {
      // Every table here is a DSN table or belongs to a curated site, so all
      // of them are pinned.
      await deps.horizons.rows(query, { pinned: true });
      return;
    } catch (error) {
      if (!isBusy(error) || retry >= WARM_BUSY_RETRIES) throw error;
    }
    await sleep(WARM_BUSY_DELAY_MS);
  }
}

/** Fetches one table into the cache; `false` (and a log line) on failure. */
async function warmOne(
  deps: WarmUpDeps,
  query: HorizonsQuery,
): Promise<boolean> {
  try {
    await fetchRetryingBusy(deps, query);
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
 * once. A table refused as busy is retried a few times after a delay. Never
 * rejects: a failed request is logged and counted, and the visitor who needs
 * it later simply triggers it again.
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
