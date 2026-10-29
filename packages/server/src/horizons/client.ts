/**
 * JPL Horizons client with a disk cache. Horizons is slow and rate limited, so a request with the same parameters is
 * sent at most once: the raw JSON body is stored under a hash of the parameters and read back from then on.
 */
import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseHorizonsTable, type HorizonsRow } from '@ventana/sim';
import { toHorizonsParams, type HorizonsQuery } from './query.ts';

/** Production endpoint of the Horizons API. */
export const HORIZONS_API_URL = 'https://ssd.jpl.nasa.gov/api/horizons.api';

/** Cache directory used when `HORIZONS_CACHE_DIR` is not set (relative to the working directory). */
export const DEFAULT_CACHE_DIR = './.cache/horizons';

/** Why a Horizons request failed: the HTTP layer, an error reported by Horizons, or a body we cannot read. */
export type HorizonsErrorKind = 'http' | 'api' | 'parse';

/** A Horizons request did not produce an observer table. */
export class HorizonsError extends Error {
  override readonly name = 'HorizonsError';
  readonly kind: HorizonsErrorKind;

  constructor(kind: HorizonsErrorKind, message: string) {
    super(message);
    this.kind = kind;
  }
}

/** The subset of `fetch` the client needs, so tests can inject a fake one. */
export type FetchLike = (url: string) => Promise<Pick<Response, 'ok' | 'status' | 'text'>>;

/** Dependencies of the client. */
export interface HorizonsClientOptions {
  readonly fetch: FetchLike;
  readonly cacheDir: string;
  readonly baseUrl?: string;
}

/** Reads observer tables from Horizons, through the disk cache. */
export interface HorizonsClient {
  /** The parsed rows of one request. */
  rows(query: HorizonsQuery): Promise<HorizonsRow[]>;
  /** The raw JSON body of one request, as Horizons sent it (used to record test fixtures). */
  raw(query: HorizonsQuery): Promise<string>;
}

// Longest excerpt of a Horizons error text copied into an error message.
const MAX_ERROR_EXCERPT = 300;

/** A stable key for a set of parameters: the SHA-256 of the sorted `name=value` pairs. */
export function cacheKey(params: Readonly<Record<string, string>>): string {
  const canonical = Object.keys(params)
    .sort()
    .map((name) => `${name}=${params[name]}`)
    .join('&');
  return createHash('sha256').update(canonical).digest('hex');
}

function excerpt(text: string): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  return flat.length > MAX_ERROR_EXCERPT ? `${flat.slice(0, MAX_ERROR_EXCERPT)}...` : flat;
}

/**
 * Checks that a Horizons body holds an observer table and returns its `result` text.
 *
 * @throws HorizonsError (`parse`) for a body that is not the expected JSON, (`api`) for an error reported by Horizons
 *   in `error` or as a `result` without a `$$SOE..$$EOE` table.
 */
export function horizonsResultText(body: string): string {
  let json: unknown;
  try {
    json = JSON.parse(body);
  } catch {
    throw new HorizonsError('parse', `Horizons answered with a body that is not JSON: ${excerpt(body)}`);
  }
  if (typeof json !== 'object' || json === null) {
    throw new HorizonsError('parse', 'Horizons answered with JSON that is not an object');
  }
  const { error, result } = json as { error?: unknown; result?: unknown };
  if (typeof error === 'string') throw new HorizonsError('api', `Horizons error: ${excerpt(error)}`);
  if (typeof result !== 'string') throw new HorizonsError('parse', 'Horizons JSON has no "result" text');
  if (!result.includes('$$SOE') || !result.includes('$$EOE')) {
    throw new HorizonsError('api', `Horizons returned no ephemeris: ${excerpt(result)}`);
  }
  return result;
}

async function readCached(path: string): Promise<string | null> {
  try {
    return await readFile(path, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
}

/** Builds a client. Only valid observer tables are cached; errors are never stored. */
export function createHorizonsClient(options: HorizonsClientOptions): HorizonsClient {
  const baseUrl = options.baseUrl ?? HORIZONS_API_URL;
  // Requests already on their way, so concurrent callers of the same query share one Horizons call.
  const inFlight = new Map<string, Promise<string>>();

  async function download(params: Record<string, string>, path: string): Promise<string> {
    const url = `${baseUrl}?${new URLSearchParams(params).toString()}`;
    let response: Awaited<ReturnType<FetchLike>>;
    try {
      response = await options.fetch(url);
    } catch (error) {
      throw new HorizonsError('http', `Horizons request failed: ${(error as Error).message}`);
    }
    const body = await response.text();
    if (!response.ok) {
      // Horizons explains a rejected request in the JSON body; keep that text when it is there.
      let detail = excerpt(body);
      try {
        horizonsResultText(body);
      } catch (error) {
        if (error instanceof HorizonsError && error.kind === 'api') detail = error.message;
      }
      throw new HorizonsError('http', `Horizons answered HTTP ${response.status}: ${detail}`);
    }
    horizonsResultText(body);
    await mkdir(options.cacheDir, { recursive: true });
    const tmp = `${path}.${process.pid}.tmp`;
    await writeFile(tmp, body, 'utf8');
    await rename(tmp, path);
    return body;
  }

  async function raw(query: HorizonsQuery): Promise<string> {
    const params = toHorizonsParams(query);
    const key = cacheKey(params);
    const path = join(options.cacheDir, `${key}.json`);
    const cached = await readCached(path);
    if (cached !== null) return cached;
    const pending = inFlight.get(key);
    if (pending) return pending;
    const request = download(params, path).finally(() => inFlight.delete(key));
    inFlight.set(key, request);
    return request;
  }

  return {
    raw,
    async rows(query) {
      const result = horizonsResultText(await raw(query));
      try {
        return parseHorizonsTable(result);
      } catch (error) {
        throw new HorizonsError('parse', (error as Error).message);
      }
    },
  };
}
