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

import {
  HOUR_MS,
  dsnOutlook,
  dsnSpans,
  isWindow,
  toIso,
  type DsnComplex,
  type HourSample,
} from '@ventana/sim';
import { siteHours } from './hours';

/** How far ahead the card looks for the next change: past a lunar month. */
const LOOK_AHEAD_H = 45 * 24;
/** How far ahead it looks for the antenna's next handoff. */
const DSN_AHEAD_MS = 2 * 24 * HOUR_MS;

/** IM-2's answer at one instant: what the landing's live card shows. */
export interface LiveAnswer {
  readonly atMs: number;
  readonly hour: HourSample;
  readonly window: boolean;
  /** Hours until the window closes (open) or opens (closed); null: later. */
  readonly changeInH: number | null;
  readonly dsn: DsnComplex | null;
  /** Milliseconds until the antenna hands over; null: past the look. */
  readonly dsnLeftMs: number | null;
}

/** The answer at `atMs`, from the simulator and IM-2's LOLA horizon. */
export function liveAnswer(atMs: number): LiveAnswer {
  const from = toIso(Math.floor(atMs / HOUR_MS) * HOUR_MS);
  const hours = siteHours(from, toIso(atMs + LOOK_AHEAD_H * HOUR_MS));
  const hour = hours[0];
  if (!hour) throw new Error('landing: the simulator gave no hours');
  const window = isWindow(hour);
  const outlook = dsnOutlook(dsnSpans(atMs, atMs + DSN_AHEAD_MS), atMs);
  return {
    atMs,
    hour,
    window,
    changeInH: hoursToFlip(hours, window),
    dsn: outlook.active,
    dsnLeftMs: outlook.untilMs === null ? null : outlook.untilMs - atMs,
  };
}

/** Whole hours from the first sample to the first whose window differs. */
function hoursToFlip(
  hours: readonly HourSample[],
  window: boolean,
): number | null {
  const at = hours.findIndex((h) => isWindow(h) !== window);
  return at < 0 ? null : at;
}
