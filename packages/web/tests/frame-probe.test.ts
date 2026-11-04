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
 * The frame-cost probe (VENT-49): while the view loads, each frame is timed
 * as its draw plus a wait for the GPU; one frame over four target frame times
 * steps the view down once; past the window no frame pays the wait.
 */
import { describe, expect, it, vi } from 'vitest';
import { COMPILED_FRAME_CEILING_MS, budgetOf, createFrameProbe, probeVerdict, SETTLE_FRAMES } from '../src/terrain/frame-probe';

/** A probe on a fake clock: each `draw` costs what `cost` says, the sync waits `waitMs`. */
function rig(options: { budgetMs?: number; waitMs?: number; armed?: boolean } = {}) {
  let clock = 0;
  let programs = 0;
  const onSlow = vi.fn();
  const sync = vi.fn(() => void (clock += options.waitMs ?? 0));
  const probe = createFrameProbe({
    budgetMs: options.budgetMs ?? 100,
    now: () => clock,
    sync,
    programs: () => programs,
    onSlow: options.armed === false ? undefined : onSlow,
  });
  /** One frame costing `ms` of draw; `compiles` adds a shader program; `busy`: the slicer still works. */
  const frame = (ms: number, busy = false, compiles = false): void =>
    probe.frame(() => {
      clock += ms;
      if (compiles) programs += 1;
    }, () => busy);
  return { frame, sync, onSlow };
}

describe('the probe\'s decision', () => {
  it('calls a frame slow only past the budget', () => {
    expect(probeVerdict([10, 99, 100], 100)).toBe('ok');
    expect(probeVerdict([10, 100.5], 100)).toBe('slow');
    expect(probeVerdict([], 100)).toBe('ok');
  });

  it('budgets four target frame times: 67 ms on high, 89 ms on medium', () => {
    expect(budgetOf(60)).toBeCloseTo(66.7, 1);
    expect(budgetOf(45)).toBeCloseTo(88.9, 1);
  });
});

describe('the probe\'s window', () => {
  it('times every frame while the slicer works, and the next few after it', () => {
    const { frame, sync, onSlow } = rig({ waitMs: 5 });
    frame(10, true);
    frame(10, true);
    frame(10, false);
    for (let i = 0; i < SETTLE_FRAMES; i++) frame(10);
    expect(sync).toHaveBeenCalledTimes(3 + SETTLE_FRAMES);
    frame(10);
    frame(10);
    expect(sync).toHaveBeenCalledTimes(3 + SETTLE_FRAMES);
    expect(onSlow).not.toHaveBeenCalled();
  });

  it('counts the wait for the GPU in the frame\'s cost', () => {
    const { frame, onSlow } = rig({ budgetMs: 100, waitMs: 95 });
    frame(10);
    expect(onSlow).toHaveBeenCalledTimes(1);
  });

  it('steps down once, on the first slow frame, and then stops timing', () => {
    const { frame, sync, onSlow } = rig();
    frame(40, true);
    frame(150, true);
    frame(300, true);
    frame(300, false);
    expect(onSlow).toHaveBeenCalledTimes(1);
    expect(sync).toHaveBeenCalledTimes(2);
  });

  it('judges a frame that compiled a shader against the ceiling, not the budget', () => {
    const { frame, onSlow } = rig();
    frame(500, true, true);
    expect(onSlow).not.toHaveBeenCalled();
    frame(500, true);
    expect(onSlow).toHaveBeenCalledTimes(1);
  });

  // VENT-69: the Pixel 10's first frame took 1637.8 ms and compiled eight programs.
  it('calls slow a compiling frame past the ceiling', () => {
    const { frame, onSlow } = rig();
    frame(COMPILED_FRAME_CEILING_MS + 1, true, true);
    expect(onSlow).toHaveBeenCalledTimes(1);
  });

  it('never judges a compiling frame by less than the budget of the tier', () => {
    const { frame, onSlow } = rig({ budgetMs: 5000 });
    frame(COMPILED_FRAME_CEILING_MS + 1, true, true);
    expect(onSlow).not.toHaveBeenCalled();
    frame(5001, true);
    expect(onSlow).toHaveBeenCalledTimes(1);
  });

  it('draws and never waits when nothing may step down', () => {
    const { frame, sync, onSlow } = rig({ armed: false });
    frame(1000, true);
    expect(sync).not.toHaveBeenCalled();
    expect(onSlow).not.toHaveBeenCalled();
  });
});
