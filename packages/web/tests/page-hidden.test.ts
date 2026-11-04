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
 * The page-hidden watch (VENT-69): it remembers a hide even when the page
 * is shown again before the compile ends.
 */
import { describe, expect, it } from 'vitest';
import { watchHidden } from '../src/terrain/scene/page-hidden';

function fakeDoc(state: 'visible' | 'hidden') {
  const listeners = new Set<() => void>();
  const doc = {
    visibilityState: state,
    addEventListener: (_: string, fn: () => void) => void listeners.add(fn),
    removeEventListener: (_: string, fn: () => void) => void listeners.delete(fn),
  };
  const set = (next: 'visible' | 'hidden'): void => {
    doc.visibilityState = next;
    for (const fn of [...listeners]) fn();
  };
  return { doc: doc as unknown as Document, set, listeners };
}

describe('watchHidden', () => {
  it('is false while the page stays visible', () => {
    expect(watchHidden(fakeDoc('visible').doc).sawHidden()).toBe(false);
  });

  it('is true when the page starts hidden', () => {
    expect(watchHidden(fakeDoc('hidden').doc).sawHidden()).toBe(true);
  });

  it('keeps a hide that ended before the question', () => {
    const { doc, set } = fakeDoc('visible');
    const watch = watchHidden(doc);
    set('hidden');
    set('visible');
    expect(watch.sawHidden()).toBe(true);
  });

  it('stops listening', () => {
    const { doc, listeners } = fakeDoc('visible');
    watchHidden(doc).stop();
    expect(listeners.size).toBe(0);
  });
});
