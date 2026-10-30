/**
 * JPL Horizons client with a disk cache. Horizons is slow and rate limited, so
 * a request with the same parameters is sent at most once: the raw JSON body
 * is stored under a hash of the parameters and read back from then on.
 *
 * This module composes the parts: the disk cache (`disk-cache.ts`: pinned/,
 * points/ under a byte cap with LRU eviction, and the legacy root), the
 * process-wide download queue (`download-queue.ts`: a few downloads at once, a
 * bounded number waiting, and a cache miss beyond that fails at once with kind
 * `busy`), the request with retries (`fetch.ts`) and the sharing of requests
 * already in flight (`in-flight.ts`).
 */
import { createHash } from 'node:crypto';
import type { HorizonsRow } from '@ventana/sim';
import { DiskCache } from './disk-cache.ts';
import { DownloadSlots } from './download-queue.ts';
import {
  fetchObserverTable,
  realSleep,
  type FetchLike,
  type HorizonsFetchOptions,
} from './fetch.ts';
import { InFlight } from './in-flight.ts';
import type { PointsUsageSource } from './points-store.ts';
import { toHorizonsParams, type HorizonsQuery } from './query.ts';
import { parseRows } from './response-body.ts';

export { HorizonsError, type HorizonsErrorKind } from './errors.ts';
export { HORIZONS_RETRY_DELAYS_MS, type FetchLike } from './fetch.ts';
export { horizonsResultText } from './response-body.ts';
export type { PointsUsage, PointsUsageSource } from './points-store.ts';

/** Production endpoint of the Horizons API. */
export const HORIZONS_API_URL = 'https://ssd.jpl.nasa.gov/api/horizons.api';

/**
 * Cache directory used when `HORIZONS_CACHE_DIR` is not set (relative to the
 * working directory).
 */
export const DEFAULT_CACHE_DIR = './.cache/horizons';

/** Horizons downloads in flight at once, across every request and warm-up. */
export const DEFAULT_MAX_CONCURRENT_DOWNLOADS = 2;
/**
 * Cache misses allowed to wait for a download slot; one more fails at once
 * with kind `busy`.
 */
export const DEFAULT_MAX_QUEUED_DOWNLOADS = 32;
/** Byte cap of `<cacheDir>/points/` when the caller sets none (512 MB). */
export const DEFAULT_MAX_POINTS_BYTES = 512 * 1024 * 1024;

/** Dependencies of the client. */
export interface HorizonsClientOptions {
  readonly fetch: FetchLike;
  readonly cacheDir: string;
  readonly baseUrl?: string;
  /** Waits between retries; tests pass one that returns at once. */
  readonly sleep?: (ms: number) => Promise<void>;
  /**
   * Downloads in flight at once (default
   * {@link DEFAULT_MAX_CONCURRENT_DOWNLOADS}).
   */
  readonly maxConcurrentDownloads?: number;
  /**
   * Cache misses that may wait for a slot (default
   * {@link DEFAULT_MAX_QUEUED_DOWNLOADS}).
   */
  readonly maxQueuedDownloads?: number;
  /**
   * Byte cap of `<cacheDir>/points/` (default
   * {@link DEFAULT_MAX_POINTS_BYTES}).
   */
  readonly maxPointsBytes?: number;
}

/** Options of one call. */
export interface HorizonsCallOptions {
  /**
   * Called once a cache miss has a download slot or a place in the queue,
   * right before it takes it (a miss refused as busy never calls it);
   * throwing refuses the download (and rejects the call).
   */
  readonly onMiss?: () => void;
  /**
   * The table is always needed: cache it in `pinned/`, out of reach of the
   * eviction.
   */
  readonly pinned?: boolean;
}

/** Reads observer tables from Horizons, through the disk cache. */
export interface HorizonsClient {
  /** The parsed rows of one request. */
  rows(
    query: HorizonsQuery,
    call?: HorizonsCallOptions,
  ): Promise<HorizonsRow[]>;
  /**
   * The raw JSON body of one request, as Horizons sent it (used to record
   * test fixtures).
   */
  raw(query: HorizonsQuery, call?: HorizonsCallOptions): Promise<string>;
}

/** The client {@link createHorizonsClient} builds, with its points cache. */
export type CachedHorizonsClient = HorizonsClient & {
  /**
   * The custom-point cache: pass it to the API's health; `ready()` sizes it
   * (once, memoised) so the server can do that at start.
   */
  readonly points: PointsUsageSource & { ready(): Promise<number> };
};

/**
 * A stable key for a set of parameters: the SHA-256 of the sorted
 * `name=value` pairs.
 */
export function cacheKey(params: Readonly<Record<string, string>>): string {
  const canonical = Object.keys(params)
    .sort()
    .map((name) => `${name}=${params[name]}`)
    .join('&');
  return createHash('sha256').update(canonical).digest('hex');
}

/** The parts {@link createHorizonsClient} composes, built from its options. */
function createParts(options: HorizonsClientOptions) {
  const fetchOptions: HorizonsFetchOptions = {
    fetch: options.fetch,
    baseUrl: options.baseUrl ?? HORIZONS_API_URL,
    sleep: options.sleep ?? realSleep,
  };
  return {
    fetchOptions,
    queue: new DownloadSlots(
      options.maxConcurrentDownloads ?? DEFAULT_MAX_CONCURRENT_DOWNLOADS,
      options.maxQueuedDownloads ?? DEFAULT_MAX_QUEUED_DOWNLOADS,
    ),
    cache: new DiskCache(
      options.cacheDir,
      options.maxPointsBytes ?? DEFAULT_MAX_POINTS_BYTES,
    ),
    inFlight: new InFlight<string>(),
  };
}

/**
 * Builds a client. Only valid observer tables are cached; errors are never
 * stored.
 */
export function createHorizonsClient(
  options: HorizonsClientOptions,
): CachedHorizonsClient {
  const { fetchOptions, queue, cache, inFlight } = createParts(options);
  async function raw(query: HorizonsQuery, call: HorizonsCallOptions = {}) {
    const params = toHorizonsParams(query);
    const key = cacheKey(params);
    const cached = await cache.lookup(key);
    if (cached !== null) return cached;
    const download = async (): Promise<string> => {
      const fetchTable = () => fetchObserverTable(fetchOptions, params);
      const body = await queue.run(fetchTable, call.onMiss);
      await cache.store(key, body, call.pinned === true);
      return body;
    };
    return inFlight.share(key, download);
  }
  return {
    raw,
    rows: async (query, call) => parseRows(await raw(query, call)),
    points: cache.points,
  };
}
