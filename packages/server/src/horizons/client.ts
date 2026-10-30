/**
 * JPL Horizons client with a disk cache. Horizons is slow and rate limited, so a request with the same parameters is
 * sent at most once: the raw JSON body is stored under a hash of the parameters and read back from then on.
 *
 * The cache has two parts. `<cacheDir>/pinned/` holds the tables the service always needs (the DSN tables and the
 * points of the curated sites; the caller says which with `pinned: true`) and is never evicted. `<cacheDir>/points/`
 * holds every other table under a byte cap, evicting the least recently used files. Tables cached before this layout,
 * directly in `<cacheDir>/`, are still read but never written. Downloads go through one process-wide queue: a few at
 * once, a bounded number waiting, and a cache miss beyond that fails at once with kind `busy`.
 */
import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile, rename, stat, unlink, utimes, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseHorizonsTable, type HorizonsRow } from '@ventana/sim';
import { toHorizonsParams, type HorizonsQuery } from './query.ts';

/** Production endpoint of the Horizons API. */
export const HORIZONS_API_URL = 'https://ssd.jpl.nasa.gov/api/horizons.api';

/** Cache directory used when `HORIZONS_CACHE_DIR` is not set (relative to the working directory). */
export const DEFAULT_CACHE_DIR = './.cache/horizons';

/** Horizons downloads in flight at once, across every request and the warm-up. */
export const DEFAULT_MAX_CONCURRENT_DOWNLOADS = 2;
/** Cache misses allowed to wait for a download slot; one more fails at once with kind `busy`. */
export const DEFAULT_MAX_QUEUED_DOWNLOADS = 32;
/** Byte cap of `<cacheDir>/points/` when the caller sets none (512 MB). */
export const DEFAULT_MAX_POINTS_BYTES = 512 * 1024 * 1024;

/**
 * Why a Horizons request failed: the HTTP layer, an error reported by Horizons, a body we cannot read, or the
 * download queue being full (`busy`, Horizons was not called).
 */
export type HorizonsErrorKind = 'http' | 'api' | 'parse' | 'busy';

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
  /** Waits between retries; tests pass one that returns at once. */
  readonly sleep?: (ms: number) => Promise<void>;
  /** Downloads in flight at once (default {@link DEFAULT_MAX_CONCURRENT_DOWNLOADS}). */
  readonly maxConcurrentDownloads?: number;
  /** Cache misses that may wait for a slot (default {@link DEFAULT_MAX_QUEUED_DOWNLOADS}). */
  readonly maxQueuedDownloads?: number;
  /** Byte cap of `<cacheDir>/points/` (default {@link DEFAULT_MAX_POINTS_BYTES}). */
  readonly maxPointsBytes?: number;
}

/** Options of one call. */
export interface HorizonsCallOptions {
  /** Called right before a cache miss is queued for download; throwing refuses the download (and rejects the call). */
  readonly onMiss?: () => void;
  /** The table is always needed: cache it in `pinned/`, out of reach of the eviction. */
  readonly pinned?: boolean;
}

/** Reads observer tables from Horizons, through the disk cache. */
export interface HorizonsClient {
  /** The parsed rows of one request. */
  rows(query: HorizonsQuery, call?: HorizonsCallOptions): Promise<HorizonsRow[]>;
  /** The raw JSON body of one request, as Horizons sent it (used to record test fixtures). */
  raw(query: HorizonsQuery, call?: HorizonsCallOptions): Promise<string>;
}

/**
 * Waits before each retry of a transient failure (a dropped connection, HTTP 429, 502, 503, 504). Horizons answered 503
 * to part of a warm-up that sent four requests at once (production, 2026-10-29); spacing the retries lets it recover.
 */
export const HORIZONS_RETRY_DELAYS_MS: readonly number[] = [1000, 3000, 8000];
const TRANSIENT_STATUS = new Set([429, 502, 503, 504]);

const realSleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

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
    if (isMissing(error)) return null;
    throw error;
  }
}

function isMissing(error: unknown): boolean {
  return (error as NodeJS.ErrnoException).code === 'ENOENT';
}

/** A counting semaphore with a bounded waiting list. */
function createDownloadSlots(maxActive: number, maxWaiting: number) {
  let active = 0;
  const waiting: (() => void)[] = [];
  return {
    /** @throws HorizonsError (`busy`) when every slot is taken and the waiting list is full. */
    async acquire(): Promise<void> {
      if (active < maxActive) {
        active += 1;
        return;
      }
      if (waiting.length >= maxWaiting) throw new HorizonsError('busy', 'too many Horizons downloads waiting');
      // The releasing download hands its slot over, so `active` does not change.
      await new Promise<void>((resolve) => waiting.push(resolve));
    },
    release(): void {
      const next = waiting.shift();
      if (next) next();
      else active -= 1;
    },
  };
}

/** The byte-capped `points/` directory: tracks its size and evicts the least recently used files. */
function createPointsStore(dir: string, maxBytes: number) {
  let size: Promise<number> | null = null;
  // Evictions run one at a time, so two of them never count the same file.
  let evicting: Promise<void> = Promise.resolve();

  async function listFiles(): Promise<{ path: string; bytes: number; mtimeMs: number }[]> {
    let names: string[];
    try {
      names = await readdir(dir);
    } catch (error) {
      if (isMissing(error)) return [];
      throw error;
    }
    const files = await Promise.all(
      names
        .filter((name) => name.endsWith('.json'))
        .map(async (name) => {
          const path = join(dir, name);
          try {
            const info = await stat(path);
            return { path, bytes: info.size, mtimeMs: info.mtimeMs };
          } catch (error) {
            if (isMissing(error)) return null;
            throw error;
          }
        }),
    );
    return files.filter((file) => file !== null);
  }

  // Initialised by a scan of the directory on first use, then kept in memory.
  const currentSize = (): Promise<number> => {
    size ??= listFiles().then((files) => files.reduce((sum, file) => sum + file.bytes, 0));
    return size;
  };

  async function evict(keep: string): Promise<void> {
    let total = await currentSize();
    if (total <= maxBytes) return;
    const files = (await listFiles()).filter((file) => file.path !== keep).sort((a, b) => a.mtimeMs - b.mtimeMs);
    for (const file of files) {
      if (total <= maxBytes) break;
      try {
        await unlink(file.path);
      } catch (error) {
        if (!isMissing(error)) throw error;
      }
      total -= file.bytes;
    }
    size = Promise.resolve(Math.max(total, 0));
  }

  return {
    /** Scans the directory if it was not scanned yet; call it before writing a file, so the scan does not count it. */
    async ready(): Promise<void> {
      await currentSize();
    },
    /** Counts a file just written, and evicts the oldest others if the cap is passed. */
    async added(path: string, bytes: number): Promise<void> {
      const before = await currentSize();
      size = Promise.resolve(before + bytes);
      evicting = evicting.then(() => evict(path));
      await evicting;
    },
  };
}

/** Builds a client. Only valid observer tables are cached; errors are never stored. */
export function createHorizonsClient(options: HorizonsClientOptions): HorizonsClient {
  const baseUrl = options.baseUrl ?? HORIZONS_API_URL;
  // Requests already on their way, so concurrent callers of the same query share one Horizons call.
  const inFlight = new Map<string, Promise<string>>();

  const sleep = options.sleep ?? realSleep;
  const pinnedDir = join(options.cacheDir, 'pinned');
  const pointsDir = join(options.cacheDir, 'points');
  const slots = createDownloadSlots(
    options.maxConcurrentDownloads ?? DEFAULT_MAX_CONCURRENT_DOWNLOADS,
    options.maxQueuedDownloads ?? DEFAULT_MAX_QUEUED_DOWNLOADS,
  );
  const points = createPointsStore(pointsDir, options.maxPointsBytes ?? DEFAULT_MAX_POINTS_BYTES);

  /** One request, retried while the failure is transient. Returns the last response, ok or not. */
  async function fetchWithRetry(url: string): Promise<{ status: number; ok: boolean; body: string }> {
    for (let attempt = 0; ; attempt++) {
      let failure: HorizonsError | null = null;
      try {
        const response = await options.fetch(url);
        const body = await response.text();
        if (response.ok || !TRANSIENT_STATUS.has(response.status)) return { status: response.status, ok: response.ok, body };
        failure = new HorizonsError('http', `Horizons answered HTTP ${response.status}: ${excerpt(body)}`);
      } catch (error) {
        failure = new HorizonsError('http', `Horizons request failed: ${(error as Error).message}`);
      }
      const wait = HORIZONS_RETRY_DELAYS_MS[attempt];
      if (wait === undefined) throw failure;
      await sleep(wait);
    }
  }

  async function download(params: Record<string, string>, key: string, pinned: boolean): Promise<string> {
    await slots.acquire();
    let body: string;
    try {
      body = await fetchChecked(params);
    } finally {
      slots.release();
    }
    const dir = pinned ? pinnedDir : pointsDir;
    const path = join(dir, `${key}.json`);
    await mkdir(dir, { recursive: true });
    if (!pinned) await points.ready();
    const tmp = `${path}.${process.pid}.tmp`;
    await writeFile(tmp, body, 'utf8');
    await rename(tmp, path);
    if (!pinned) await points.added(path, Buffer.byteLength(body, 'utf8'));
    return body;
  }

  /** One request to Horizons; returns the body once it holds an observer table. */
  async function fetchChecked(params: Record<string, string>): Promise<string> {
    const url = `${baseUrl}?${new URLSearchParams(params).toString()}`;
    const response = await fetchWithRetry(url);
    const body = response.body;
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
    return body;
  }

  /** The cached body of `key`: pinned/, then points/ (refreshing its mtime, for the LRU), then the legacy root. */
  async function lookup(key: string): Promise<string | null> {
    const name = `${key}.json`;
    const pinned = await readCached(join(pinnedDir, name));
    if (pinned !== null) return pinned;
    const pointPath = join(pointsDir, name);
    const point = await readCached(pointPath);
    if (point !== null) {
      const now = new Date();
      // An eviction may have removed the file since the read; the body is still good.
      await utimes(pointPath, now, now).catch((error: unknown) => {
        if (!isMissing(error)) throw error;
      });
      return point;
    }
    return readCached(join(options.cacheDir, name));
  }

  async function raw(query: HorizonsQuery, call: HorizonsCallOptions = {}): Promise<string> {
    const params = toHorizonsParams(query);
    const key = cacheKey(params);
    const cached = await lookup(key);
    if (cached !== null) return cached;
    const pending = inFlight.get(key);
    if (pending) return pending;
    call.onMiss?.();
    const request = download(params, key, call.pinned === true).finally(() => inFlight.delete(key));
    inFlight.set(key, request);
    return request;
  }

  return {
    raw,
    async rows(query, call) {
      const result = horizonsResultText(await raw(query, call));
      try {
        return parseHorizonsTable(result);
      } catch (error) {
        throw new HorizonsError('parse', (error as Error).message);
      }
    },
  };
}
