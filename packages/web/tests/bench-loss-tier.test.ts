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

/** The on-foot view's tier at the moment its context is lost (VENT-107), before the view drops it to low. */
import { describe, expect, it } from 'vitest';
import { tierAtLoss } from '../src/bench/loss-tier';

describe('tierAtLoss', () => {
  it('is null until a context is lost', () => {
    const watch = tierAtLoss(new EventTarget(), () => 'high');
    expect(watch.tier()).toBeNull();
    watch.stop();
  });

  it('keeps the tier the view had when its context went, not the low it drops to after', () => {
    const doc = new EventTarget();
    let tier: string | null = 'medium';
    const watch = tierAtLoss(doc, () => tier);
    // The view's own handler, registered first, drops the tier: the capture phase still runs before it.
    doc.addEventListener('webglcontextlost', () => { tier = 'low'; });
    doc.dispatchEvent(new Event('webglcontextlost'));
    expect(tier).toBe('low');
    expect(watch.tier()).toBe('medium');
    tier = 'high';
    doc.dispatchEvent(new Event('webglcontextlost'));
    expect(watch.tier()).toBe('medium');
    watch.stop();
  });

  it('hears nothing once stopped', () => {
    const doc = new EventTarget();
    const watch = tierAtLoss(doc, () => 'high');
    watch.stop();
    doc.dispatchEvent(new Event('webglcontextlost'));
    expect(watch.tier()).toBeNull();
  });
});
