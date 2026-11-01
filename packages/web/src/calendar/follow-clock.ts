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
 * Keeps a live instant on the clock, to the minute: at each whole minute,
 * and when a hidden page comes back in a later minute (phone/hour-clock.ts).
 * The DSN names who listens and for how long to the minute (VENT-7), so an
 * hourly step would leave it wrong for up to an hour; what is worked out
 * per hour or month (the hours, the calendar) is keyed by them and stays
 * put. A chosen instant (scrubbed or played) is left alone.
 */
import { MINUTE_MS } from '@ventana/sim';
import { watchClock, type HourClockDeps } from '../phone/hour-clock';
import type { TimeStore } from './time-store';

/** Starts following; returns the function that stops it. */
export function followClock(
  store: TimeStore,
  clock: HourClockDeps,
): () => void {
  return watchClock(clock, MINUTE_MS, () => {
    if (store.get().live) store.now();
  });
}
