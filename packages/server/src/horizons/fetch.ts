/** One Horizons request over HTTP, retried while the failure is transient. */
import { HorizonsError, excerpt } from './errors.ts';
import { horizonsResultText } from './response-body.ts';

/** The subset of `fetch` the client needs, so tests can inject a fake one. */
export type FetchLike = (
  url: string,
) => Promise<Pick<Response, 'ok' | 'status' | 'text'>>;

/**
 * Waits before each retry of a transient failure (a dropped connection, HTTP
 * 429, 502, 503, 504). Horizons answered 503 to part of a warm-up that sent
 * four requests at once (production, 2026-10-29); spacing the retries lets it
 * recover.
 */
export const HORIZONS_RETRY_DELAYS_MS: readonly number[] = [1000, 3000, 8000];
const TRANSIENT_STATUS = new Set([429, 502, 503, 504]);

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

/** One attempt: the response, or the transient failure to retry. */
async function attempt(
  fetch: FetchLike,
  url: string,
): Promise<FetchedBody | HorizonsError> {
  try {
    const response = await fetch(url);
    const body = await response.text();
    const { ok, status } = response;
    if (ok || !TRANSIENT_STATUS.has(status)) return { status, ok, body };
    return new HorizonsError(
      'http',
      `Horizons answered HTTP ${status}: ${excerpt(body)}`,
    );
  } catch (error) {
    return new HorizonsError(
      'http',
      `Horizons request failed: ${(error as Error).message}`,
    );
  }
}

/**
 * One request, retried while the failure is transient. Returns the last
 * response, ok or not.
 */
async function fetchWithRetry(
  options: HorizonsFetchOptions,
  url: string,
): Promise<FetchedBody> {
  for (let retry = 0; ; retry++) {
    const outcome = await attempt(options.fetch, url);
    if (!(outcome instanceof HorizonsError)) return outcome;
    const wait = HORIZONS_RETRY_DELAYS_MS[retry];
    if (wait === undefined) throw outcome;
    await options.sleep(wait);
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
