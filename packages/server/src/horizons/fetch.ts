/** One Horizons request over HTTP, retried while the failure is transient. */
import { HorizonsError, excerpt } from './errors.ts';
import { horizonsResultText } from './response-body.ts';
import { retryAfterMs, type HeaderSource } from './retry-after.ts';

/**
 * The subset of `fetch` the client needs, so tests can inject a fake one.
 * `headers` is read only for the Retry-After of a 429; a fake may omit it.
 */
export type FetchLike = (url: string) => Promise<
  Pick<Response, 'ok' | 'status' | 'text'> & {
    readonly headers?: HeaderSource;
  }
>;

/**
 * Waits before each retry of a transient failure (a dropped connection, HTTP
 * 429, 502, 503, 504). Horizons answered 503 to part of a warm-up that sent
 * four requests at once (production, 2026-10-29); spacing the retries lets it
 * recover.
 */
export const HORIZONS_RETRY_DELAYS_MS: readonly number[] = [1000, 3000, 8000];
const TRANSIENT_STATUS = new Set([429, 502, 503, 504]);
const HTTP_TOO_MANY_REQUESTS = 429;
// A Retry-After longer than this is cut to it: a visitor is waiting.
const MAX_RETRY_DELAY_MS = Math.max(...HORIZONS_RETRY_DELAYS_MS);

/** Waits `ms` milliseconds on a real timer. */
export const realSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

interface FetchedBody {
  readonly status: number;
  readonly ok: boolean;
  readonly body: string;
}

/** What a request to Horizons needs from the outside. */
export interface HorizonsFetchOptions {
  readonly fetch: FetchLike;
  readonly baseUrl: string;
  readonly sleep: (ms: number) => Promise<void>;
}

/**
 * A failure worth retrying, and the wait Horizons asked for (a 429's
 * Retry-After), if any.
 */
interface TransientFailure {
  readonly error: HorizonsError;
  readonly retryAfterMs: number | null;
}

/** One attempt: the response, or the transient failure to retry. */
async function attempt(
  fetch: FetchLike,
  url: string,
): Promise<FetchedBody | TransientFailure> {
  try {
    const response = await fetch(url);
    const body = await response.text();
    const { ok, status } = response;
    if (ok || !TRANSIENT_STATUS.has(status)) return { status, ok, body };
    const message = `Horizons answered HTTP ${status}: ${excerpt(body)}`;
    const asked = status === HTTP_TOO_MANY_REQUESTS;
    return {
      error: new HorizonsError('http', message),
      retryAfterMs: asked ? retryAfterMs(response.headers) : null,
    };
  } catch (error) {
    const message = `Horizons request failed: ${(error as Error).message}`;
    return { error: new HorizonsError('http', message), retryAfterMs: null };
  }
}

/**
 * One request, retried while the failure is transient: after the fixed
 * delays, or as long as a 429's Retry-After asks (never less than the fixed
 * delay, never more than the longest).
 * Returns the last response, ok or not.
 */
async function fetchWithRetry(
  options: HorizonsFetchOptions,
  url: string,
): Promise<FetchedBody> {
  for (let retry = 0; ; retry++) {
    const outcome = await attempt(options.fetch, url);
    if ('body' in outcome) return outcome;
    const wait = HORIZONS_RETRY_DELAYS_MS[retry];
    if (wait === undefined) throw outcome.error;
    const asked = outcome.retryAfterMs;
    // A Retry-After of 0 or 1 s would hammer a rate-limited Horizons: never
    // wait less than the fixed delay of this retry.
    const delay =
      asked === null
        ? wait
        : Math.max(wait, Math.min(asked, MAX_RETRY_DELAY_MS));
    await options.sleep(delay);
  }
}

/**
 * The detail of a rejected request. Horizons explains a rejected request in
 * the JSON body; keep that text when it is there.
 */
function rejectionDetail(body: string): string {
  try {
    horizonsResultText(body);
  } catch (error) {
    if (error instanceof HorizonsError && error.kind === 'api') {
      return error.message;
    }
  }
  return excerpt(body);
}

/**
 * One request to Horizons; returns the body once it holds an observer table.
 *
 * @throws HorizonsError (`http`) when Horizons stays unreachable or rejects
 *   the request, and whatever {@link horizonsResultText} throws for the body.
 */
export async function fetchObserverTable(
  options: HorizonsFetchOptions,
  params: Readonly<Record<string, string>>,
): Promise<string> {
  const query = new URLSearchParams(params).toString();
  const response = await fetchWithRetry(options, `${options.baseUrl}?${query}`);
  if (!response.ok) {
    throw new HorizonsError(
      'http',
      `Horizons answered HTTP ${response.status}: ${rejectionDetail(response.body)}`,
    );
  }
  horizonsResultText(response.body);
  return response.body;
}
