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

import { describe, expect, it } from 'vitest';
import { createLoop } from '../src/globe/loop';
import { pacedSchedule } from '../src/terrain/scene/turn-pace';

/** A fake display: every `tick` runs the callbacks asked for, at 60 Hz. */
function display() {
  let now = 0;
  let next = 1;
  const queue = new Map<number, (t: number) => void>();
  return {
    raf: (fn: (t: number) => void) => {
      queue.set(next, fn);
      return next++;
    },
    cancel: (id: number) => void queue.delete(id),
    tick: () => {
      now += 1000 / 60;
      const due = [...queue.values()];
      queue.clear();
      for (const fn of due) fn(now);
    },
    pending: () => queue.size,
  };
}

function setup(turning: { on: boolean }) {
  const screen = display();
  const pace = pacedSchedule({ turning: () => turning.on, raf: screen.raf,
    cancel: screen.cancel, minGapMs: 30 });
  const drawn: number[] = [];
  const loop = createLoop(() => {
    drawn.push(drawn.length);
    return true;
  }, pace.schedule, pace.cancel);
  return { screen, loop, drawn };
}

describe('frames while turning on a phone (VENT-73)', () => {
  it('draws at most 30 a second while turning', () => {
    const turning = { on: true };
    const { screen, loop, drawn } = setup(turning);
    loop.invalidate();
    for (let i = 0; i < 60; i += 1) screen.tick();
    expect(drawn.length).toBeGreaterThanOrEqual(28);
    expect(drawn.length).toBeLessThanOrEqual(31);
  });

  it('draws every refresh when not turning', () => {
    const { screen, loop, drawn } = setup({ on: false });
    loop.invalidate();
    for (let i = 0; i < 60; i += 1) screen.tick();
    expect(drawn.length).toBe(60);
  });

  it('draws the held frame at once when the turn ends', () => {
    const turning = { on: true };
    const { screen, loop, drawn } = setup(turning);
    loop.invalidate();
    screen.tick();
    screen.tick();
    const before = drawn.length;
    turning.on = false;
    screen.tick();
    expect(drawn.length).toBe(before + 1);
  });

  it('draws nothing idle, and a cancelled frame never comes', () => {
    const { screen, loop, drawn } = setup({ on: true });
    for (let i = 0; i < 10; i += 1) screen.tick();
    expect(drawn.length).toBe(0);
    loop.invalidate();
    loop.stop();
    screen.tick();
    expect(drawn.length).toBe(0);
    expect(screen.pending()).toBe(0);
  });
});
