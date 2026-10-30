import { describe, expect, it } from 'vitest';
import { FixedWindowLimiter } from '../src/fixed-window-limiter.ts';

const WINDOW_MS = 10_000;

function limiter(clock: { ms: number }, maxKeys = 100): FixedWindowLimiter {
  return new FixedWindowLimiter({ limit: 2, windowMs: WINDOW_MS, now: () => clock.ms, maxKeys });
}

describe('FixedWindowLimiter', () => {
  it('opens a new window when exactly the window length has passed', () => {
    const clock = { ms: 0 };
    const counter = limiter(clock);
    clock.ms = 5000;
    counter.take('a');
    counter.take('a');
    // A prune at 10 s keeps a; at 15 s none is due, so the key's own window
    // decides.
    clock.ms = WINDOW_MS;
    counter.take('b');
    clock.ms = 5000 + WINDOW_MS;
    expect(counter.take('a')).toBe(0);
    expect(counter.take('a')).toBe(0);
    expect(counter.take('a')).toBe(10);
  });

  it('prunes expired keys once a window has passed, with room left in the map', () => {
    const clock = { ms: 0 };
    const counter = limiter(clock);
    counter.take('a');
    counter.take('b');
    clock.ms = WINDOW_MS;
    counter.take('c');
    expect(counter.size()).toBe(1);
  });

  it('keeps keys whose window is still open', () => {
    const clock = { ms: 0 };
    const counter = limiter(clock);
    counter.take('a');
    clock.ms = WINDOW_MS / 2;
    counter.take('b');
    clock.ms = WINDOW_MS;
    counter.take('c');
    expect(counter.size()).toBe(2);
  });
});
