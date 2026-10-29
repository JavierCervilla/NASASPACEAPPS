/** Builds the hours, windows and metrics of one lunar point from Horizons tables. */
import {
  HOUR_MS,
  buildHourSamples,
  computeRangeMetrics,
  groupBlocks,
  isWindow,
  toIso,
  toMs,
  type DsnComplex,
  type Ephemeris,
  type HorizonsRow,
} from '@ventana/sim';
import type { HorizonsClient } from './horizons/client.ts';
import { HORIZONS_API_URL } from './horizons/client.ts';
import { BODY, DSN_COMPLEXES, DSN_SITES, monthsCovering, type HorizonsQuery, type MonthSpan } from './horizons/query.ts';

/** A point and an hourly range, already validated. Times are ms since the epoch, on whole hours. */
export interface EphemerisRequest {
  readonly lat: number;
  readonly lonEast: number;
  readonly fromMs: number;
  /** Last hour of the range, inclusive. */
  readonly toMs: number;
  /** Reference hour for the "what comes next" metrics. */
  readonly atMs: number;
}

// Horizons calls in flight at once for one request: enough to fetch a two-month range in about three rounds, few
// enough not to hammer a rate-limited service.
const MAX_PARALLEL_REQUESTS = 4;

/** Runs `fn` over `items` with at most `limit` calls in flight, and returns the results in the order of `items`. */
export async function mapLimited<T, R>(items: readonly T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const worker = async (): Promise<void> => {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await fn(items[index] as T);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

type Table = 'sun' | 'earth' | DsnComplex;

function queriesFor(request: EphemerisRequest, month: MonthSpan): [Table, HorizonsQuery][] {
  const site = { lat: request.lat, lonEast: request.lonEast, altKm: 0 };
  const span = { start: month.start, stop: month.stop };
  return [
    ['sun', { target: BODY.sun, centerBody: BODY.moon, point: site, ...span }],
    ['earth', { target: BODY.earth, centerBody: BODY.moon, point: site, ...span }],
    ...DSN_COMPLEXES.map((complex): [Table, HorizonsQuery] => [
      complex,
      { target: BODY.moon, centerBody: BODY.earth, point: DSN_SITES[complex], ...span },
    ]),
  ];
}

/** Every Horizons request {@link computeEphemeris} sends for a request (the cache warm-up sends the same ones). */
export function ephemerisQueries(request: EphemerisRequest): HorizonsQuery[] {
  return monthsCovering(request.fromMs, request.toMs).flatMap((month) => queriesFor(request, month).map(([, q]) => q));
}

/**
 * The ephemeris of one point. Horizons is asked for whole calendar months (shared cache entries) and the rows are
 * sliced to the requested range here.
 */
export async function computeEphemeris(client: HorizonsClient, request: EphemerisRequest): Promise<Ephemeris> {
  const jobs = monthsCovering(request.fromMs, request.toMs).flatMap((month) => queriesFor(request, month));
  const tables = await mapLimited(jobs, MAX_PARALLEL_REQUESTS, async ([table, query]) => ({
    table,
    rows: await client.rows(query),
  }));
  const inRange = (row: HorizonsRow): boolean => {
    const ms = toMs(row.t);
    return ms >= request.fromMs && ms <= request.toMs;
  };
  const rowsOf = (table: Table): HorizonsRow[] =>
    tables.filter((t) => t.table === table).flatMap((t) => t.rows.filter(inRange));
  const hours = buildHourSamples({
    sun: rowsOf('sun'),
    earth: rowsOf('earth'),
    moonFromDsn: { goldstone: rowsOf('goldstone'), canberra: rowsOf('canberra'), madrid: rowsOf('madrid') },
  });
  const expectedHours = (request.toMs - request.fromMs) / HOUR_MS + 1;
  if (hours.length !== expectedHours) {
    throw new RangeError(`Horizons returned ${hours.length} hours for a range of ${expectedHours}`);
  }
  return {
    lat: request.lat,
    lonEast: request.lonEast,
    from: toIso(request.fromMs),
    to: toIso(request.toMs),
    hours,
    windows: groupBlocks(hours, isWindow),
    metrics: computeRangeMetrics(hours, toIso(request.atMs)),
    source: { label: 'JPL Horizons (DE441)', url: HORIZONS_API_URL },
  };
}
