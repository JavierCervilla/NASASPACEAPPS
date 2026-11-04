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
 * The scene's compile before its first frame (VENT-69): timed, noted in the
 * crash report, a tier down when it is slow, never blocking the view when
 * it fails or never ends, and the loop shut until it is done.
 */
import { describe, expect, it, vi } from 'vitest';
import {
  COMPILE_BUDGET_MS,
  COMPILE_GIVE_UP_MS,
  compileFirst,
  compileVerdict,
  MAPS_GIVE_UP_MS,
  waitAtMost,
} from '../src/terrain/scene/scene-compile';
import { gateLoop } from '../src/terrain/scene/loop-gate';

/** A compile that takes `ms` of a fake clock. */
function rig(ms: number, fails = false) {
  let clock = 0;
  const notes: string[] = [];
  const onSlow = vi.fn();
  const deps = {
    compile: () => {
      clock += ms;
      return fails ? Promise.reject(new Error('link failed')) : Promise.resolve();
    },
    now: () => clock,
    wait: () => new Promise<void>(() => undefined),
    note: (text: string) => void notes.push(text),
    onSlow,
    hidden: () => false,
  };
  return { deps, notes, onSlow };
}

describe('the compile\'s verdict', () => {
  it('is slow only past the budget, which the incident\'s 1.6 s exceeded', () => {
    expect(compileVerdict(COMPILE_BUDGET_MS)).toBe('ok');
    expect(compileVerdict(COMPILE_BUDGET_MS + 1)).toBe('slow');
    expect(compileVerdict(1637.8)).toBe('slow');
    expect(compileVerdict(40)).toBe('ok');
  });
});

describe('compileFirst', () => {
  it('notes the time and does not step down when the compile is quick', async () => {
    const { deps, notes, onSlow } = rig(120);
    expect(await compileFirst(deps)).toBe(120);
    expect(notes).toEqual(['programs compiled in 120 ms']);
    expect(onSlow).not.toHaveBeenCalled();
  });

  it('steps the tier down once when it is over the budget', async () => {
    const { deps, notes, onSlow } = rig(1700);
    await compileFirst(deps);
    expect(onSlow).toHaveBeenCalledTimes(1);
    expect(notes[0]).toBe('programs compiled in 1700 ms, over the budget');
  });

  it('may have nobody to tell when the tier cannot step down', async () => {
    const { deps } = rig(1700);
    await expect(compileFirst({ ...deps, onSlow: undefined })).resolves.toBe(1700);
  });

  it('notes a failed compile and lets the first frame compile the rest', async () => {
    const { deps, notes } = rig(10, true);
    await expect(compileFirst(deps)).resolves.toBe(10);
    expect(notes[0]).toContain('program compile failed: Error: link failed');
  });

  it('gives up on a compile that never ends', async () => {
    let clock = 0;
    const { deps, onSlow } = rig(0);
    const waited: number[] = [];
    const ms = await compileFirst({
      ...deps,
      compile: () => new Promise<void>(() => undefined),
      now: () => clock,
      wait: (limit) => {
        waited.push(limit);
        clock += limit;
        return Promise.resolve();
      },
    });
    expect(waited).toEqual([COMPILE_GIVE_UP_MS]);
    expect(ms).toBe(COMPILE_GIVE_UP_MS);
    expect(onSlow).toHaveBeenCalledTimes(1);
  });
});

describe('a compile the page was hidden for', () => {
  it('is not judged: a hidden page spaces its timers, the time says nothing of the GPU', async () => {
    const { deps, notes, onSlow } = rig(1700);
    await compileFirst({ ...deps, hidden: () => true });
    expect(onSlow).not.toHaveBeenCalled();
    expect(notes[0]).toBe('programs compiled in 1700 ms, page was hidden: not judged');
  });
});

describe('waitAtMost (the surface maps\' wait)', () => {
  it('resolves when the work does, before the cap', async () => {
    const wait = vi.fn(() => new Promise<void>(() => undefined));
    await expect(waitAtMost(Promise.resolve(), MAPS_GIVE_UP_MS, wait)).resolves.toBe('done');
    expect(wait).toHaveBeenCalledWith(MAPS_GIVE_UP_MS);
  });

  it('gives up on work that stalls and says so', async () => {
    const stalled = new Promise<void>(() => undefined);
    await expect(waitAtMost(stalled, MAPS_GIVE_UP_MS, () => Promise.resolve())).resolves.toBe('timeout');
  });

  it('caps the wait at 5 s', () => {
    expect(MAPS_GIVE_UP_MS).toBe(5000);
  });
});

describe('gateLoop', () => {
  it('draws nothing until it is opened, then asks for the first frame', () => {
    const loop = { invalidate: vi.fn(), stop: vi.fn() };
    const gated = gateLoop(loop);
    gated.invalidate();
    gated.invalidate();
    expect(loop.invalidate).not.toHaveBeenCalled();
    gated.open();
    expect(loop.invalidate).toHaveBeenCalledTimes(1);
    gated.invalidate();
    expect(loop.invalidate).toHaveBeenCalledTimes(2);
  });

  it('stops the loop it gates, open or not', () => {
    const loop = { invalidate: vi.fn(), stop: vi.fn() };
    gateLoop(loop).stop();
    expect(loop.stop).toHaveBeenCalledTimes(1);
  });
});
