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
 * Plays time forward: from the selected hour to the end of its month, a
 * few hours per tick, then stops. Moving the instant any other way (a
 * scrub, «Now») stops it. The timers are injected.
 */
import { HOUR_MS } from '@ventana/sim';
import { createWatchedValue, type WatchedValue } from '../lib/watched-value';
import type { HourClockDeps } from '../phone/hour-clock';
import { monthEndMs, monthStartMs } from './month';
import type { TimeStore } from './time-store';

export type PlayTimers = Pick<HourClockDeps, 'setTimer' | 'clearTimer'>;

export interface PlaySpeed {
  /** Hours each tick moves the instant. */
  readonly stepHours: number;
  readonly tickMs: number;
}

/** About a 30-day month in 12 s: 60 hours a second. */
export const PLAY_SPEED: PlaySpeed = { stepHours: 6, tickMs: 100 };

export interface Player {
  readonly play: () => void;
  readonly pause: () => void;
  readonly playing: () => boolean;
  /** Calls `listener` when playing starts or stops; the unsubscribe. */
  readonly subscribe: (listener: () => void) => () => void;
}

/** A player's parts and the run in progress. */
interface Run {
  readonly store: TimeStore;
  readonly timers: PlayTimers;
  readonly speed: PlaySpeed;
  readonly playing: WatchedValue<boolean>;
  timer: number | null;
  /** The last hour of the month being played. */
  end: number;
  /** The instant the player itself set last. */
  own: number;
}

/** Where playing starts: this hour, or the month's first at its end. */
function startHour(atMs: number): number {
  const hour = Math.floor(atMs / HOUR_MS) * HOUR_MS;
  return hour >= monthEndMs(hour) ? monthStartMs(hour) : hour;
}

function stop(run: Run): void {
  if (run.timer === null) return;
  run.timers.clearTimer(run.timer);
  run.timer = null;
  run.playing.set(false);
}

/** Moves the instant one step; the last step, at the month's end, stops. */
function step(run: Run): void {
  run.own = Math.min(run.own + run.speed.stepHours * HOUR_MS, run.end);
  run.store.set(run.own);
  if (run.own < run.end) {
    run.timer = run.timers.setTimer(() => step(run), run.speed.tickMs);
  } else {
    stop(run);
  }
}

function start(run: Run): void {
  if (run.timer !== null) return;
  run.own = startHour(run.store.get().atMs);
  run.end = monthEndMs(run.own);
  run.store.set(run.own);
  run.timer = run.timers.setTimer(() => step(run), run.speed.tickMs);
  run.playing.set(true);
}

/** A player of `store`'s instant, at `speed`. */
export function createPlayer(
  store: TimeStore,
  timers: PlayTimers,
  speed: PlaySpeed = PLAY_SPEED,
): Player {
  const playing = createWatchedValue(false);
  const run: Run = {
    ...{ store, timers, speed, playing },
    ...{ timer: null, end: 0, own: Number.NaN },
  };
  store.subscribe(() => {
    const { atMs, live } = store.get();
    if (live || atMs !== run.own) stop(run);
  });
  const play = (): void => start(run);
  const pause = (): void => stop(run);
  return { play, pause, playing: playing.get, subscribe: playing.subscribe };
}
