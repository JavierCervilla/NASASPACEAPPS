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
 * React hooks of the shared instant: the selected time, whether it plays,
 * the selected site's hours for the month of that time, and all three
 * with the month's bars for a calendar view.
 */
import { useEffect, useState, useSyncExternalStore } from 'react';
import { monthStartMs } from '../../calendar/month';
import { monthStrip } from '../../calendar/month-strip';
import type { Player } from '../../calendar/time-player';
import type { TimeState, TimeStore } from '../../calendar/time-store';
import type { HoursLoader } from '../../phone/hours-cache';
import { monthDiff } from '../../calendar/month-diff';
import { useSiteHours, type HoursParts } from '../use-site-hours';
import {
  LOADING,
  loadMonthHours,
  type HoursResult,
} from '../../phone/widgets-loader';

const onServer = (): null => null;

/**
 * The selected instant, re-rendering on every change; null on the server
 * and while hydrating, so a static build never bakes its own clock in.
 */
export function useTime(time: TimeStore): TimeState | null {
  return useSyncExternalStore(time.subscribe, time.get, onServer);
}

/** Whether the player is playing, re-rendering when that changes. */
export function usePlaying(player: Player): boolean {
  return useSyncExternalStore(player.subscribe, player.playing, () => false);
}

/**
 * The hours of site `id` for the month of `atMs` (null: none yet). It asks
 * only when the site or the month changes, never on a new hour of the
 * same month; a retry asks again.
 */
export function useMonthHours(
  load: HoursLoader,
  id: string,
  atMs: number | null,
) {
  const month = atMs === null ? null : monthStartMs(atMs);
  const [attempt, setAttempt] = useState(0);
  const [kept, setKept] = useState<{ key: string; value: HoursResult }>();
  const key = `${id}@${month}#${attempt}`;
  useEffect(() => {
    if (month === null) return undefined;
    let live = true;
    void loadMonthHours(load, id, month).then((value) => {
      if (live) setKept({ key, value });
    });
    return () => {
      live = false;
    };
  }, [load, id, month, key]);
  const retry = (): void => setAttempt((n) => n + 1);
  const result: HoursResult = kept?.key === key ? kept.value : LOADING;
  return { result, retry };
}

/** What a calendar view needs from the page: shared by every view. */
export interface CalendarParts extends HoursParts {
  readonly time: TimeStore;
  readonly player: Player;
}

/**
 * The instant, playing, the month's hours and its bars, for site `id`;
 * and, under «Compare», where the bars disagree with the computed hours.
 */
export function useCalendar(parts: CalendarParts, id: string) {
  const state = useTime(parts.time);
  const playing = usePlaying(parts.player);
  const atMs = state?.atMs ?? null;
  const hours = useSiteHours(parts, id, atMs);
  const { result, compare } = hours;
  const ready = atMs !== null && result.kind === 'ready';
  const strip = ready ? monthStrip(result.hours, atMs) : null;
  const diff = ready && compare.kind === 'ready'
    ? monthDiff(result.hours, compare.computed, atMs)
    : null;
  return { ...hours, state, playing, strip, diff };
}

export type Calendar = ReturnType<typeof useCalendar>;
