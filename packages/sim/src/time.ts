/** Hour arithmetic on ISO 8601 UTC strings. Deterministic: never reads the clock. */

/** One hour in milliseconds. */
export const HOUR_MS = 3_600_000;

/** Milliseconds since the Unix epoch of an ISO 8601 instant. */
export function toMs(iso: string): number {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) throw new RangeError(`not an ISO 8601 instant: "${iso}"`);
  return ms;
}

/** ISO 8601 in UTC without milliseconds (`2026-11-01T00:00:00Z`), the format of every time in the data contract. */
export function toIso(ms: number): string {
  return new Date(ms).toISOString().replace(/\.\d{3}Z$/, 'Z');
}

/** `iso` moved by `hours` hours. */
export function addHours(iso: string, hours: number): string {
  return toIso(toMs(iso) + hours * HOUR_MS);
}

/** Hours from `from` to `to` (negative when `to` is earlier). */
export function hoursBetween(from: string, to: string): number {
  return (toMs(to) - toMs(from)) / HOUR_MS;
}
