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
import { createSlicer } from '../src/terrain/scene/slicer';

/** A slicer on a fake clock; every job costs `cost` ms and a turn waits. */
function rig(cost: number) {
  let now = 0;
  const turns: (() => void)[] = [];
  const frames = { n: 0 };
  const slicer = createSlicer({ invalidate: () => void (frames.n += 1),
    now: () => now, budgetMs: 1, frameGapMs: 1500,
    schedule: (fn) => turns.push(fn), cancel: () => turns.splice(0) });
  const job = () => () => void (now += cost);
  const pass = (ms: number) => void (now += ms);
  const runTurn = () => turns.shift()?.();
  return { slicer, frames, job, pass, runTurn };
}

describe('the slicer after an idle period (VENT-72)', () => {
  it('asks the first intermediate frame of a new batch at once, not 1.5 s on', () => {
    const { slicer, frames, job, pass, runTurn } = rig(5);
    slicer.add('first', 0, job());
    runTurn();
    expect(frames.n, 'the last job asks its frame').toBe(1);
    pass(10_000);
    slicer.add('a', 0, job());
    slicer.add('b', 1, job());
    runTurn();
    expect(frames.n, 'a turn of a new batch is due at once').toBe(2);
  });

  it('still counts the gap from the end of a frame that ran between turns', () => {
    const { slicer, frames, job, pass, runTurn } = rig(5);
    for (const name of ['a', 'b', 'c', 'd']) slicer.add(name, 0, job());
    runTurn();
    expect(frames.n).toBe(1);
    pass(400);
    runTurn();
    expect(frames.n, 'inside the gap counted from the frame that ran').toBe(1);
  });
});
