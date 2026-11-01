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

/** Work kept off the start-up (VENT-7): idle callbacks, or a timer without them. */
import { describe, expect, it, vi } from 'vitest';
import { afterStart, FALLBACK_DELAY_MS, START_TIMEOUT_MS } from '../src/lib/after-start';

const timers = () => ({ setTimeout: vi.fn(() => 7), clearTimeout: vi.fn() });

describe('afterStart', () => {
  it('waits for an idle moment, at most the timeout, and cancels it', () => {
    const host = { ...timers(), requestIdleCallback: vi.fn(() => 3), cancelIdleCallback: vi.fn() };
    const run = vi.fn();
    const cancel = afterStart(run, host);
    expect(host.requestIdleCallback).toHaveBeenCalledWith(run, { timeout: START_TIMEOUT_MS });
    expect(run).not.toHaveBeenCalled();
    cancel();
    expect(host.cancelIdleCallback).toHaveBeenCalledWith(3);
    expect(host.setTimeout).not.toHaveBeenCalled();
  });

  it('without idle callbacks, waits a short timer instead', () => {
    const host = timers();
    const run = vi.fn();
    const cancel = afterStart(run, host);
    expect(host.setTimeout).toHaveBeenCalledWith(run, FALLBACK_DELAY_MS);
    cancel();
    expect(host.clearTimeout).toHaveBeenCalledWith(7);
  });
});
