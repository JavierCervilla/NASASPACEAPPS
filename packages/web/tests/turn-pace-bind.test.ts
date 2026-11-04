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
import { pacedSchedule } from '../src/terrain/scene/turn-pace';

/**
 * VENT-74: the browser's requestAnimationFrame throws «Illegal invocation»
 * when called with any `this` but the window. The pace must call the raf it
 * is given as a plain function, never as a method of its deps.
 */
describe('turn pace binding', () => {
  it('calls raf and cancel without a receiver, as the browser requires', () => {
    const receivers: unknown[] = [];
    function raf(this: unknown, fn: (now: number) => void): number {
      receivers.push(this);
      fn(0);
      return 1;
    }
    function cancel(this: unknown): void {
      receivers.push(this);
    }
    const pace = pacedSchedule({ raf, cancel, turning: () => false });
    const id = pace.schedule(() => undefined);
    pace.cancel(id);
    expect(receivers.every((r) => r === undefined)).toBe(true);
  });
});
