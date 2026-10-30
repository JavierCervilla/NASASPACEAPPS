/**
 * Builds the hours, windows and metrics of one lunar point from Horizons
 * tables.
 */
import {
  HOUR_MS,
  buildHourSamples,
  computeRangeMetrics,
  groupBlocks,
  isWindow,
  toIso,
  toMs,
  type Ephemeris,
  type HorizonsRow,
  type HourSample,
} from '@ventana/sim';
import {
  jobsFor,
  type EphemerisRequest,
  type Table,
} from './ephemeris-queries.ts';
import {
  HORIZONS_API_URL,
  type HorizonsCallOptions,
  type HorizonsClient,
} from './horizons/client.ts';
import type { HorizonsQuery } from './horizons/query.ts';
import { mapLimited } from './map-limited.ts';

export type { EphemerisRequest } from './ephemeris-queries.ts';

// Horizons calls in flight at once for one request: enough to fetch a two-month
// range in about three rounds, few enough not to hammer a rate-limited service.
const MAX_PARALLEL_REQUESTS = 4;

/** How {@link computeEphemeris} calls the client. */
export interface EphemerisCallOptions {
  /**
   * Passed to every client call: runs before each cache miss is downloaded, and
   * throws to refuse it.
   */
  readonly onMiss?: () => void;
  /**
   * The point is a curated site's: cache its tables as pinned. The DSN tables
   * do not depend on the point and are always pinned.
   */
  readonly pinnedPoint?: boolean;
}

/**
 * The rows of every table, sliced to the requested range. The point's tables
 * are pinned when it is a curated site's; the DSN tables always are.
 */
async function fetchRowsByTable(
  client: HorizonsClient,
  request: EphemerisRequest,
  options: EphemerisCallOptions,
): Promise<(table: Table) => HorizonsRow[]> {
  const fetchJob = async ([table, query]: [Table, HorizonsQuery]) => {
    const pinned =
      options.pinnedPoint === true || (table !== 'sun' && table !== 'earth');
    const call: HorizonsCallOptions = options.onMiss
      ? { onMiss: options.onMiss, pinned }
      : { pinned };
    return { table, rows: await client.rows(query, call) };
  };
  const jobs = jobsFor(request);
  const tables = await mapLimited(jobs, MAX_PARALLEL_REQUESTS, fetchJob);
  const inRange = (row: HorizonsRow): boolean => {
    const ms = toMs(row.t);
    return ms >= request.fromMs && ms <= request.toMs;
  };
  return (table) =>
    tables
      .filter((t) => t.table === table)
      .flatMap((t) => t.rows.filter(inRange));
}

/**
 * The hourly samples of the range.
 *
 * @throws RangeError when the tables do not cover every hour of the range.
 */
function hoursOf(
  rowsOf: (table: Table) => HorizonsRow[],
  request: EphemerisRequest,
): HourSample[] {
  const hours = buildHourSamples({
    sun: rowsOf('sun'),
    earth: rowsOf('earth'),
    moonFromDsn: {
      goldstone: rowsOf('goldstone'),
      canberra: rowsOf('canberra'),
      madrid: rowsOf('madrid'),
    },
  });
  const expectedHours = (request.toMs - request.fromMs) / HOUR_MS + 1;
  if (hours.length !== expectedHours) {
    throw new RangeError(
      `Horizons returned ${hours.length} hours for a range of ${expectedHours}`,
    );
  }
  return hours;
}

/**
 * The ephemeris of one point. Horizons is asked for whole calendar months
 * (shared cache entries) and the rows are sliced to the requested range here.
 */
export async function computeEphemeris(
  client: HorizonsClient,
  request: EphemerisRequest,
  options: EphemerisCallOptions = {},
): Promise<Ephemeris> {
  const rowsOf = await fetchRowsByTable(client, request, options);
  const hours = hoursOf(rowsOf, request);
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
