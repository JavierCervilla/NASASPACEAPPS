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
 * What the calendar's controls do to the selected instant: move it to an
 * hour of its month, by some hours (held inside the month, as a slider
 * is), or by whole months while the API has data for them.
 */
import { HOUR_MS } from '@ventana/sim';
import { widgetRange } from '../phone/widget-range';
import { monthHours, monthStartMs, shiftMonth } from './month';
import type { TimeStore } from './time-store';

/** The hour of its month `atMs` falls in, from 0. */
export function hourOfMonth(atMs: number): number {
  return Math.floor((atMs - monthStartMs(atMs)) / HOUR_MS);
}

/** Selects hour `hour` of the month of `atMs`, held inside the month. */
export function moveToHour(time: TimeStore, atMs: number, hour: number) {
  const last = monthHours(atMs) - 1;
  const held = Math.min(last, Math.max(0, hour));
  time.set(monthStartMs(atMs) + held * HOUR_MS);
}

/** Whether the month `delta` months from `atMs` has data. */
export function canShiftMonth(atMs: number, delta: number): boolean {
  return widgetRange(shiftMonth(atMs, delta)) !== null;
}

/** Moves the instant `delta` months, when that month has data. */
export function moveMonths(time: TimeStore, atMs: number, delta: number) {
  if (canShiftMonth(atMs, delta)) time.set(shiftMonth(atMs, delta));
}
