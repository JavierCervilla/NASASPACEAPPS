/**
 * The range the phone widgets ask the API for: the current UTC month, held
 * inside the window the API answers for, and the hour that counts as now.
 */
import { HOUR_MS, toIso } from '@ventana/sim';

export interface MonthRange {
  /** First day, `YYYY-MM-DD` (the API reads it as 00:00 UTC). */
  readonly from: string;
  /** Last day, `YYYY-MM-DD` (the API reads it as 23:00 UTC). */
  readonly to: string;
  /** The reference hour, ISO 8601 UTC, inside the range. */
  readonly at: string;
  /** The month's English name, for «47 % of November». */
  readonly month: string;
}

/** The API's window (packages/server/src/params.ts), as UTC months. */
const FIRST_MONTH = { year: 2026, month: 0 };
const LAST_MONTH = { year: 2027, month: 11 };
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June', 'July',
  'August', 'September', 'October', 'November', 'December',
];

function monthIndex({ year, month }: { year: number; month: number }) {
  return year * 12 + month;
}

/** `YYYY-MM-DD` of a UTC instant in ms. */
function day(ms: number): string {
  return toIso(ms).slice(0, 10);
}

/** The month of `nowMs`, clamped to the API's window, and its now. */
export function monthRange(nowMs: number): MonthRange {
  const now = new Date(nowMs);
  const wanted = monthIndex({
    year: now.getUTCFullYear(),
    month: now.getUTCMonth(),
  });
  const index = Math.min(
    Math.max(wanted, monthIndex(FIRST_MONTH)),
    monthIndex(LAST_MONTH),
  );
  const fromMs = Date.UTC(Math.floor(index / 12), index % 12, 1);
  const toMs = Date.UTC(Math.floor(index / 12), (index % 12) + 1, 1) - HOUR_MS;
  const hour = Math.floor(nowMs / HOUR_MS) * HOUR_MS;
  const atMs = Math.min(Math.max(hour, fromMs), toMs);
  const month = MONTHS[index % 12] ?? '';
  return { from: day(fromMs), to: day(toMs), at: toIso(atMs), month };
}
