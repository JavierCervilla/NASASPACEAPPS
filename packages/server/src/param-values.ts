/** Parsers of single query parameter values, shared by the ephemeris routes. */
import { HOUR_MS } from '@ventana/sim';

/** A query parameter was missing or out of range; the message says which. */
export class ParamError extends Error {
  override readonly name = 'ParamError';
}

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
// An instant must name its zone as `Z`, so the server's local zone never
// shifts it.
const UTC_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?Z$/;
const LAST_HOUR_OF_DAY_MS = 23 * HOUR_MS;

/**
 * A number parameter between `min` and `max`, inclusive.
 *
 * @throws ParamError when it is missing, not a number or out of range.
 */
export function numberParam(
  name: string,
  raw: string | undefined,
  min: number,
  max: number,
): number {
  const blank = raw === undefined || raw.trim() === '';
  const value = blank ? Number.NaN : Number(raw);
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new ParamError(`"${name}" must be a number from ${min} to ${max}`);
  }
  return value;
}

/**
 * A time parameter: a UTC date (`2026-11-01`, which means its first hour, or
 * its last hour when `endOfDay`) or a UTC instant on a whole hour
 * (`2026-11-01T05:00:00Z`).
 *
 * @throws ParamError when it is neither, or not on a whole hour.
 */
export function hourParam(
  name: string,
  raw: string | undefined,
  endOfDay: boolean,
): number {
  const value = raw?.trim() ?? '';
  let ms = Number.NaN;
  if (DATE_ONLY.test(value)) {
    const offset = endOfDay ? LAST_HOUR_OF_DAY_MS : 0;
    ms = Date.parse(`${value}T00:00:00Z`) + offset;
  } else if (UTC_INSTANT.test(value)) ms = Date.parse(value);
  if (Number.isNaN(ms) || ms % HOUR_MS !== 0) {
    throw new ParamError(
      `"${name}" must be a UTC date (YYYY-MM-DD) or a UTC instant on the hour (YYYY-MM-DDTHH:00:00Z)`,
    );
  }
  return ms;
}
