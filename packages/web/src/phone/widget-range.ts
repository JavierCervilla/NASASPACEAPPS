/*
 *   _   _       _                         _ _
 *  | | | |_ __ (_)_   _____ _ __ ___  ___| | | ___
 *  | | | | '_ \| \ \ / / _ \ '__/ __|/ _ \ | |/ _ \
 *  | |_| | | | | |\ V /  __/ |  \__ \  __/ | |  __/
 *   \___/|_| |_|_| \_/ \___|_|  |___/\___|_|_|\___|
 *
 *             =++==--::.
 *         %%%%##**++=--:..  .
 *      ##**#%@%%#***+=--::.   .
 *    #**=+*#*#**#++++=-:::.. .  .
 *   #++-====*@%+*++==--::...   .  .    Ventana Lunar
 *  #+=-=--++==+===-+==--:..   .  .  .  Sun, Earth and landing
 * #----====-------=-=---:..  .  .  .   windows at the lunar
 * #+---+=====--=---==-::..     .  .  . south pole
 * #*----==---==-=-=-:-....    .  .  .
 * *#----===+*===--:-::...    .  .  .   Built for the NASA Space
 *  *----=*-+*%*+=-:::....   .  .  .    Apps Challenge 2026,
 *   *------=+*=--:::-:::.. .  .  .     Madrid. Not endorsed
 *    %*===-=-==--==-:::.  .  .  .      by NASA.
 *      *+:--+:--::::::.  .  .  .
 *         -=:::...:..   .  .           (c) 2026 Universelle
 *             :::.. .  .               SPDX-License-Identifier: MIT
 */

/**
 * The range the phone widgets ask the API for, in one request: the current
 * UTC month (for the month's window share) joined to a rolling horizon from
 * the current hour to 30 days later (for «Right now», the countdowns and
 * the DSN antenna), so a countdown never collapses at the end of a month.
 * Outside the API's data window there is no range: the sheet says so.
 */
import { HOUR_MS, toIso } from '@ventana/sim';

export interface WidgetRange {
  /** The request's first hour, ISO 8601 UTC: the month's first hour. */
  readonly from: string;
  /** The request's last hour: the later of the month's and the horizon's. */
  readonly to: string;
  /** The current hour, ISO 8601 UTC: where the horizon starts. */
  readonly at: string;
  /** The month's last hour; the share counts `from` to this. */
  readonly monthEnd: string;
  /** The horizon's last hour: `at` plus 30 days, held inside the window. */
  readonly horizonEnd: string;
  /** The month's English name, for «47 % of November». */
  readonly month: string;
}

/** How far ahead the countdowns look, in hours (30 days). */
export const HORIZON_HOURS = 30 * 24;
/** The API's window (packages/server/src/params.ts), first and last hour. */
const FIRST_HOUR_MS = Date.UTC(2026, 0, 1);
const LAST_HOUR_MS = Date.UTC(2028, 0, 1) - HOUR_MS;
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June', 'July',
  'August', 'September', 'October', 'November', 'December',
];

/**
 * The range for the instant `nowMs`, or null when its hour falls outside
 * the API's data window (2026-01-01 to 2027-12-31, UTC).
 */
export function widgetRange(nowMs: number): WidgetRange | null {
  const atMs = Math.floor(nowMs / HOUR_MS) * HOUR_MS;
  if (atMs < FIRST_HOUR_MS || atMs > LAST_HOUR_MS) return null;
  const now = new Date(atMs);
  const [year, month] = [now.getUTCFullYear(), now.getUTCMonth()];
  const fromMs = Date.UTC(year, month, 1);
  const monthEndMs = Date.UTC(year, month + 1, 1) - HOUR_MS;
  const horizonMs = Math.min(atMs + HORIZON_HOURS * HOUR_MS, LAST_HOUR_MS);
  return {
    from: toIso(fromMs),
    to: toIso(Math.max(monthEndMs, horizonMs)),
    at: toIso(atMs),
    monthEnd: toIso(monthEndMs),
    horizonEnd: toIso(horizonMs),
    month: MONTHS[month] ?? '',
  };
}
