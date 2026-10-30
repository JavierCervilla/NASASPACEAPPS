/** The wait a rate-limited Horizons asks for in its Retry-After header. */

/** The part of `Headers` the client reads; a test fake may leave it out. */
export interface HeaderSource {
  get(name: string): string | null;
}

const DELAY_SECONDS = /^\d+$/;

/**
 * The Retry-After delay in ms, or `null` when the header is missing or not a
 * number of seconds (the HTTP-date form is not read: the fixed delays apply).
 */
export function retryAfterMs(headers: HeaderSource | undefined): number | null {
  const value = headers?.get('retry-after')?.trim() ?? '';
  return DELAY_SECONDS.test(value) ? Number(value) * 1000 : null;
}
