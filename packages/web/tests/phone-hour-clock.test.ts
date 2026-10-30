import { HOUR_MS } from '@ventana/sim';
import { describe, expect, it, vi } from 'vitest';
import { watchHour, type HourClockDeps } from '../src/phone/hour-clock';

const START = Date.parse('2026-11-23T18:40:00Z');

/** A clock, timers and a page visibility the test moves by hand. */
function fakeDeps() {
  let now = START;
  let visibility: DocumentVisibilityState = 'visible';
  const timers = new Map<number, { at: number; fn: () => void }>();
  const listeners = new Set<() => void>();
  let nextId = 1;
  const deps: HourClockDeps = {
    now: () => now,
    setTimer: (fn, ms) => {
      timers.set(nextId, { at: now + ms, fn });
      return nextId++;
    },
    clearTimer: (id) => void timers.delete(id),
    page: {
      visible: () => visibility === 'visible',
      onVisibilityChange: (fn) => {
        listeners.add(fn);
        return () => void listeners.delete(fn);
      },
    },
  };
  /** Moves the clock to `ms`, firing the timers due on the way. */
  const advanceTo = (ms: number): void => {
    now = ms;
    for (const [id, timer] of [...timers]) {
      if (timer.at <= ms) {
        timers.delete(id);
        timer.fn();
      }
    }
  };
  const setVisibility = (state: DocumentVisibilityState): void => {
    visibility = state;
    listeners.forEach((fn) => fn());
  };
  return { deps, advanceTo, setVisibility, timers, listeners };
}

describe('watchHour', () => {
  it('calls back at the top of each hour, and not before', () => {
    const fake = fakeDeps();
    const onHour = vi.fn();
    watchHour(fake.deps, onHour);
    fake.advanceTo(Date.parse('2026-11-23T18:59:59Z'));
    expect(onHour).not.toHaveBeenCalled();
    fake.advanceTo(Date.parse('2026-11-23T19:00:00Z'));
    expect(onHour).toHaveBeenCalledOnce();
    fake.advanceTo(Date.parse('2026-11-23T20:00:00Z'));
    expect(onHour).toHaveBeenCalledTimes(2);
  });

  it('calls back when the page becomes visible in a later hour', () => {
    const fake = fakeDeps();
    const onHour = vi.fn();
    watchHour(fake.deps, onHour);
    fake.setVisibility('hidden');
    // A hidden tab may hold its timers back: the clock moves without them firing.
    fake.timers.clear();
    fake.advanceTo(START + 3 * HOUR_MS);
    expect(onHour).not.toHaveBeenCalled();
    fake.setVisibility('visible');
    expect(onHour).toHaveBeenCalledOnce();
    // The timer is set again for the next top of the hour.
    fake.advanceTo(Date.parse('2026-11-23T22:00:00Z'));
    expect(onHour).toHaveBeenCalledTimes(2);
  });

  it('stays quiet when the page comes back within the same hour', () => {
    const fake = fakeDeps();
    const onHour = vi.fn();
    watchHour(fake.deps, onHour);
    fake.setVisibility('hidden');
    fake.advanceTo(START + 60_000);
    fake.setVisibility('visible');
    expect(onHour).not.toHaveBeenCalled();
  });

  it('stops: no timer and no listener left', () => {
    const fake = fakeDeps();
    const onHour = vi.fn();
    watchHour(fake.deps, onHour)();
    expect(fake.timers.size).toBe(0);
    expect(fake.listeners.size).toBe(0);
    fake.advanceTo(START + HOUR_MS);
    expect(onHour).not.toHaveBeenCalled();
  });
});
