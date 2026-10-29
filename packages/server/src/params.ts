/** Validation of the query parameters of the ephemeris routes. */
import { HOUR_MS } from '@ventana/sim';
import type { EphemerisRequest } from './ephemeris.ts';

/** Longest range one request may ask for, in days (a little over a quarter). */
export const MAX_SPAN_DAYS = 92;

/** A query parameter was missing or out of range; the message says which. */
export class ParamError extends Error {
  override readonly name = 'ParamError';
}

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
// An instant must name its zone as `Z`, so the server's local zone never shifts it.
const UTC_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?Z$/;

function number(name: string, raw: string | undefined, min: number, max: number): number {
  const value = raw === undefined || raw.trim() === '' ? Number.NaN : Number(raw);
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new ParamError(`"${name}" must be a number from ${min} to ${max}`);
  }
  return value;
}

/**
 * A time parameter: a UTC date (`2026-11-01`, which means its first hour, or its last hour when `endOfDay`) or a UTC
 * instant on a whole hour (`2026-11-01T05:00:00Z`).
 */
function hour(name: string, raw: string | undefined, endOfDay: boolean): number {
  const value = raw?.trim() ?? '';
  let ms = Number.NaN;
  if (DATE_ONLY.test(value)) ms = Date.parse(`${value}T00:00:00Z`) + (endOfDay ? 23 * HOUR_MS : 0);
  else if (UTC_INSTANT.test(value)) ms = Date.parse(value);
  if (Number.isNaN(ms) || ms % HOUR_MS !== 0) {
    throw new ParamError(`"${name}" must be a UTC date (YYYY-MM-DD) or a UTC instant on the hour (YYYY-MM-DDTHH:00:00Z)`);
  }
  return ms;
}

/** The parameters every ephemeris request carries. */
export interface RawEphemerisParams {
  readonly lat?: string | undefined;
  readonly lon?: string | undefined;
  readonly from?: string | undefined;
  readonly to?: string | undefined;
  readonly at?: string | undefined;
}

/**
 * Validates the parameters of an ephemeris request. `lon` is the east longitude. Without `at`, the reference hour
 * is the current hour when it falls in the range, else the start of the range.
 *
 * @throws ParamError naming the first invalid parameter.
 */
export function parseEphemerisParams(raw: RawEphemerisParams, nowMs: number): EphemerisRequest {
  const lat = number('lat', raw.lat, -90, 90);
  const lonEast = number('lon', raw.lon, -180, 360);
  const fromMs = hour('from', raw.from, false);
  const toMsValue = hour('to', raw.to, true);
  if (toMsValue < fromMs) throw new ParamError('"to" must not be before "from"');
  if (toMsValue - fromMs > MAX_SPAN_DAYS * 24 * HOUR_MS) {
    throw new ParamError(`the range must not be longer than ${MAX_SPAN_DAYS} days`);
  }
  let atMs: number;
  if (raw.at === undefined) {
    const nowHour = Math.floor(nowMs / HOUR_MS) * HOUR_MS;
    atMs = nowHour >= fromMs && nowHour <= toMsValue ? nowHour : fromMs;
  } else {
    atMs = hour('at', raw.at, false);
  }
  return { lat, lonEast, fromMs, toMs: toMsValue, atMs };
}
