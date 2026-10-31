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
import type { TextKey } from '../i18n/catalogue';
import type { I18n } from '../i18n/translate';
import { formatSpan } from './format';
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
  /**
   * In the phone's pill, longest first, so a narrow pill drops «left»,
   * then the name, and never the time: «Window · 7 d left», «Window ·
   * 7 d», «7 d».
   */
  readonly lines: readonly string[];
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
const BADGES: Readonly<Record<NowState, TextKey>> = {
  window: 'state.badge.window',
  sun: 'state.badge.sun',
  earth: 'state.badge.earth',
  none: 'state.badge.none',
};
const LINES: Readonly<Record<NowState, TextKey>> = {
  window: 'state.line.window',
  sun: 'state.line.sun',
  earth: 'state.line.earth',
  none: 'state.line.none',
};

const HOURS_PER_DAY = 24;

/**
 * How long the state of `now` holds, to the largest whole unit, so the
 * pill stays one short line at 360 px: «7 d», «5 h», or «30+ d» when it
 * outlasts the horizon; and that unit's count, which «left» agrees with.
 */
function shortLeft(horizon: readonly HourSample[], now: HourSample) {
  const kind = nowState(now);
  const keeps = (sample: HourSample): boolean => nowState(sample) === kind;
  const left = hoursUntilLost(horizon, now.t, keeps);
  const last = horizon.at(-1)?.t ?? now.t;
  const hours = left ?? hoursBetween(now.t, last) + 1;
  const days = Math.floor(hours / HOURS_PER_DAY);
  return { hours, count: days === 0 ? hours : days, runsOn: left === null };
}

/**
 * The state at the hour of `atMs`; null until its hours are known. `open`
 * when the hours are the simulator's, which have no data window.
 */
export function siteState(
  hours: HoursResult,
  atMs: number | null,
  i18n: I18n,
  open = false,
): SiteState | null {
  const range = atMs === null ? null : widgetRange(atMs, open);
  if (!range || hours.kind !== 'ready') return null;
  const horizon = samplesWithin(hours.hours, range.at, range.horizonEnd);
  const now = sampleAt(horizon, range.at);
  if (!now) return null;
  const kind = nowState(now);
  const span = shortLeft(horizon, now);
  const left = formatSpan(i18n, span.hours, span.runsOn);
  const named = { state: i18n.t(LINES[kind]), left };
  const long = i18n.plural('pill.long', span.count, named);
  const lines = [long, i18n.t('pill.short', named), left];
  return { kind, badge: i18n.t(BADGES[kind]), lines };
}

/** What the pill says while there is no state, by where the hours stand. */
const NO_STATE: Readonly<Record<HoursStatus, TextKey>> = {
  pending: 'pill.loading',
  // Hours in, but none at this instant: the calendar's own words.
  ready: 'pill.noHour',
  error: 'pill.error',
  outside: 'pill.outside',
};

/**
 * The pill's second line, longest first: the state with its time left,
 * or why there is none.
 */
export function stateLines(
  state: SiteState | null,
  status: HoursStatus,
  i18n: I18n,
): readonly string[] {
  return state ? state.lines : [i18n.t(NO_STATE[status])];
}
