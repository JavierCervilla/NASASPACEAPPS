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
 * Which of the four signal states holds at the selected hour, and how long
 * it lasts: the phone's site pill and the desktop site card's image
 * badge. The state is the «Right now» widget's own (`nowState`) on the
 * same rolling horizon, so they never disagree; and, while there is no
 * state, whether the hours are coming or failed. Pure.
 */
import { hoursBetween, hoursUntilLost, type HourSample } from '@ventana/sim';
import { nowState } from './now-widget';
import { sampleAt, samplesWithin } from './site-widgets';
import { widgetRange } from './widget-range';
import type { HoursResult } from './widgets-loader';
import type { NowState } from './widget-types';

/** The state, its names, and how long it lasts. */
export interface SiteState {
  readonly kind: NowState;
  /** On the desktop card's image: «Landing window now», «Neither». */
  readonly badge: string;
  /** In the phone's pill, with the time left: «Window · 7 d left». */
  readonly line: string;
}

/**
 * Where the site's hours stand: still on their way (or the clock not yet
 * running), in, failed, or outside the data window.
 */
export type HoursStatus = 'pending' | 'ready' | 'error' | 'outside';

/** Where `hours` stand at `atMs`. */
export function hoursStatus(
  hours: HoursResult,
  atMs: number | null,
): HoursStatus {
  if (atMs === null || hours.kind === 'loading') return 'pending';
  return hours.kind;
}

/**
 * The desktop badge's names of the four states, and the pill's: the
 * calendar legend's words (Sun, Earth, window, Neither), short enough
 * that the longest line fits whole at 360 px.
 */
const BADGES: Readonly<Record<NowState, string>> = {
  window: 'Landing window now',
  sun: 'Sun only',
  earth: 'Earth only',
  none: 'Neither',
};
const LINES: Readonly<Record<NowState, string>> = {
  window: 'Window',
  sun: 'Sun',
  earth: 'Earth',
  none: 'Neither',
};

const HOURS_PER_DAY = 24;

/**
 * How long `kind` holds from `now`, to the largest whole unit, so the
 * pill stays one short line at 360 px: «7 d», «5 h», or «30+ d» when it
 * outlasts the horizon. The sheet's widgets give it to the hour.
 */
function shortLeft(horizon: readonly HourSample[], now: HourSample) {
  const kind = nowState(now);
  const keeps = (sample: HourSample): boolean => nowState(sample) === kind;
  const left = hoursUntilLost(horizon, now.t, keeps);
  const last = horizon.at(-1)?.t ?? now.t;
  const hours = left ?? hoursBetween(now.t, last) + 1;
  const days = Math.floor(hours / HOURS_PER_DAY);
  const span = days === 0 ? `${Math.max(0, hours)} h` : `${days} d`;
  return left === null ? span.replace(' ', '+ ') : span;
}

/** The state at the hour of `atMs`; null until its hours are known. */
export function siteState(
  hours: HoursResult,
  atMs: number | null,
): SiteState | null {
  const range = atMs === null ? null : widgetRange(atMs);
  if (!range || hours.kind !== 'ready') return null;
  const horizon = samplesWithin(hours.hours, range.at, range.horizonEnd);
  const now = sampleAt(horizon, range.at);
  if (!now) return null;
  const kind = nowState(now);
  const left = shortLeft(horizon, now);
  return { kind, badge: BADGES[kind], line: `${LINES[kind]} · ${left} left` };
}

/** What the pill says while there is no state, by where the hours stand. */
const NO_STATE: Readonly<Record<HoursStatus, string>> = {
  pending: 'Loading…',
  // Hours in, but none at this instant: the calendar's own words.
  ready: 'No data for this hour',
  error: 'Data unavailable',
  outside: 'Outside the data window',
};

/** The pill's second line: the state with its time left, or why not. */
export function stateLine(
  state: SiteState | null,
  status: HoursStatus,
): string {
  return state ? state.line : NO_STATE[status];
}
