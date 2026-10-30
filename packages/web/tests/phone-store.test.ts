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

import { describe, expect, it, vi } from 'vitest';
import { createSiteStore } from '../src/phone/site-store';

describe('createSiteStore', () => {
  it('starts on the given site', () => {
    expect(createSiteStore('im2-athena').get().id).toBe('im2-athena');
  });

  it('tells its listeners who picked the new site', () => {
    const store = createSiteStore('im2-athena');
    const listener = vi.fn();
    store.subscribe(listener);
    store.select('apollo11', 'list');
    expect(listener).toHaveBeenCalledOnce();
    expect(store.get()).toEqual({ id: 'apollo11', origin: 'list' });
  });

  it('stays quiet when the same site is picked again', () => {
    const store = createSiteStore('im2-athena');
    const listener = vi.fn();
    store.subscribe(listener);
    store.select('im2-athena', 'globe');
    expect(listener).not.toHaveBeenCalled();
  });

  it('stops calling a listener once it unsubscribes', () => {
    const store = createSiteStore('im2-athena');
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    unsubscribe();
    store.select('apollo11', 'globe');
    expect(listener).not.toHaveBeenCalled();
  });

  it('keeps separate stores apart: no shared module state', () => {
    const a = createSiteStore('im2-athena');
    const b = createSiteStore('im2-athena');
    a.select('apollo11', 'list');
    expect(b.get().id).toBe('im2-athena');
  });
});
