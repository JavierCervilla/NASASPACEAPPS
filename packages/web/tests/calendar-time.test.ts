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

import { describe, expect, it, vi } from 'vitest';
import { followClock } from '../src/calendar/follow-clock';
import { createPlayer, PLAY_SPEED } from '../src/calendar/time-player';
import { createTimeStore } from '../src/calendar/time-store';
import type { HourClockDeps } from '../src/phone/hour-clock';

const HOUR = 3_600_000;
const MINUTE = 60_000;
const NOW = Date.parse('2026-11-23T18:20:00Z');

/** Timers that run only when the test says so. */
function manualTimers() {
  const due = new Map<number, { fn: () => void; ms: number }>();
  let next = 1;
  return {
    setTimer: (fn: () => void, ms: number) => {
      due.set(next, { fn, ms });
      return next++;
    },
    clearTimer: (id: number) => void due.delete(id),
    /** Runs every timer pending now, once. */
    tick: () => {
      const timers = [...due.values()];
      due.clear();
      timers.forEach((timer) => timer.fn());
    },
    pending: () => due.size,
    /** The delays the pending timers were set with. */
    delays: () => [...due.values()].map((timer) => timer.ms),
  };
}

/** A page visibility the test flips by hand. */
function fakePage() {
  let visible = true;
  const listeners = new Set<() => void>();
  const page: HourClockDeps['page'] = {
    visible: () => visible,
    onVisibilityChange: (fn) => {
      listeners.add(fn);
      return () => void listeners.delete(fn);
    },
  };
  const set = (next: boolean): void => {
    visible = next;
    listeners.forEach((fn) => fn());
  };
  return { page, set };
}

describe('time store', () => {
  it('starts live, on the clock', () => {
    const store = createTimeStore(() => NOW);
    expect(store.get()).toEqual({ atMs: NOW, live: true });
  });

  it('leaves live mode when an instant is set, and tells its listeners', () => {
    const store = createTimeStore(() => NOW);
    const listener = vi.fn();
    store.subscribe(listener);
    store.set(NOW - 5 * HOUR);
    expect(store.get()).toEqual({ atMs: NOW - 5 * HOUR, live: false });
    expect(listener).toHaveBeenCalledOnce();
  });

  it('goes back to live mode on now(), reading the clock again', () => {
    let clock = NOW;
    const store = createTimeStore(() => clock);
    store.set(NOW - 5 * HOUR);
    clock = NOW + 2 * HOUR;
    store.now();
    expect(store.get()).toEqual({ atMs: NOW + 2 * HOUR, live: true });
  });

  it('stays quiet when nothing changes, and after unsubscribing', () => {
    const store = createTimeStore(() => NOW);
    const listener = vi.fn();
    const stop = store.subscribe(listener);
    store.now();
    expect(listener).not.toHaveBeenCalled();
    stop();
    store.set(0);
    expect(listener).not.toHaveBeenCalled();
  });
});

describe('followClock', () => {
  function fakeClock(start: number) {
    const timers = manualTimers();
    let now = start;
    const deps: HourClockDeps = {
      now: () => now,
      ...timers,
      page: { visible: () => true, onVisibilityChange: () => () => undefined },
    };
    return { deps, timers, advance: (ms: number) => (now += ms) };
  }

  it('moves a live instant when the hour turns', () => {
    const clock = fakeClock(NOW);
    const store = createTimeStore(clock.deps.now);
    followClock(store, clock.deps);
    clock.advance(HOUR);
    clock.timers.tick();
    expect(store.get()).toEqual({ atMs: NOW + HOUR, live: true });
  });

  it('moves a live instant at each whole minute (a DSN handoff)', () => {
    const clock = fakeClock(NOW);
    const store = createTimeStore(clock.deps.now);
    followClock(store, clock.deps);
    clock.advance(MINUTE);
    clock.timers.tick();
    expect(store.get()).toEqual({ atMs: NOW + MINUTE, live: true });
    clock.advance(19 * MINUTE);
    clock.timers.tick();
    expect(store.get()).toEqual({ atMs: NOW + 20 * MINUTE, live: true });
  });

  it('arms the next timer for the next whole minute', () => {
    const clock = fakeClock(NOW + 20_000);
    followClock(createTimeStore(clock.deps.now), clock.deps);
    expect(clock.timers.delays()).toEqual([MINUTE - 20_000]);
  });

  it('catches up when a hidden page comes back in a later minute', () => {
    const clock = fakeClock(NOW);
    const page = fakePage();
    const store = createTimeStore(clock.deps.now);
    followClock(store, { ...clock.deps, page: page.page });
    page.set(false);
    clock.advance(7 * MINUTE);
    expect(store.get().atMs).toBe(NOW);
    page.set(true);
    expect(store.get()).toEqual({ atMs: NOW + 7 * MINUTE, live: true });
  });

  it('stays put when the page comes back within the same minute', () => {
    const clock = fakeClock(NOW);
    const page = fakePage();
    const store = createTimeStore(clock.deps.now);
    const listener = vi.fn();
    followClock(store, { ...clock.deps, page: page.page });
    store.subscribe(listener);
    page.set(false);
    clock.advance(30_000);
    page.set(true);
    expect(listener).not.toHaveBeenCalled();
  });

  it('leaves a chosen instant alone', () => {
    const clock = fakeClock(NOW);
    const store = createTimeStore(clock.deps.now);
    followClock(store, clock.deps);
    store.set(NOW - 48 * HOUR);
    clock.advance(HOUR);
    clock.timers.tick();
    expect(store.get()).toEqual({ atMs: NOW - 48 * HOUR, live: false });
  });

  it('stops following once disposed', () => {
    const clock = fakeClock(NOW);
    const store = createTimeStore(clock.deps.now);
    followClock(store, clock.deps)();
    expect(clock.timers.pending()).toBe(0);
  });
});

describe('player', () => {
  const setUp = (atMs = NOW) => {
    const timers = manualTimers();
    const store = createTimeStore(() => atMs);
    const player = createPlayer(store, timers);
    return { timers, store, player };
  };

  it('plays a 30-day month in about 12 s', () => {
    const hoursPerSecond = (PLAY_SPEED.stepHours * 1000) / PLAY_SPEED.tickMs;
    expect((30 * 24) / hoursPerSecond).toBeCloseTo(12, 0);
  });

  it('leaves live mode on the hour and steps forward on each tick', () => {
    const { timers, store, player } = setUp();
    const listener = vi.fn();
    player.subscribe(listener);
    player.play();
    expect(player.playing()).toBe(true);
    expect(listener).toHaveBeenCalledOnce();
    expect(store.get()).toEqual({ atMs: Date.parse('2026-11-23T18:00:00Z'), live: false });
    timers.tick();
    expect(store.get().atMs).toBe(Date.parse('2026-11-23T18:00:00Z') + PLAY_SPEED.stepHours * HOUR);
  });

  it('stops at the last hour of the month', () => {
    const { timers, store, player } = setUp(Date.parse('2026-11-30T20:00:00Z'));
    player.play();
    timers.tick();
    expect(store.get().atMs).toBe(Date.parse('2026-11-30T23:00:00Z'));
    expect(player.playing()).toBe(false);
    expect(timers.pending()).toBe(0);
  });

  it('starts over from the first hour when pressed at the end of the month', () => {
    const { store, player } = setUp(Date.parse('2026-11-30T23:30:00Z'));
    player.play();
    expect(store.get().atMs).toBe(Date.parse('2026-11-01T00:00:00Z'));
  });

  it('pauses, and cancels the pending step', () => {
    const { timers, store, player } = setUp();
    player.play();
    player.pause();
    const at = store.get().atMs;
    timers.tick();
    expect(player.playing()).toBe(false);
    expect(store.get().atMs).toBe(at);
  });

  it('stops when someone else moves the instant or goes back to now', () => {
    for (const move of [(s: ReturnType<typeof setUp>['store']) => s.set(0), (s: ReturnType<typeof setUp>['store']) => s.now()]) {
      const { timers, store, player } = setUp();
      player.play();
      move(store);
      expect(player.playing()).toBe(false);
      expect(timers.pending()).toBe(0);
    }
  });
});
