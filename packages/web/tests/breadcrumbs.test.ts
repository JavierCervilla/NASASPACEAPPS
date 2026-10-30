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

import { afterEach, describe, expect, it, vi } from 'vitest';
import { Breadcrumbs } from '../src/devtools/breadcrumbs';
import { watchContext } from '../src/devtools/context-watch';
import { defaultStorage, readTrail, type TrailStorage } from '../src/devtools/trail-storage';

function memoryStorage(): TrailStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return { data, getItem: (key) => data.get(key) ?? null, setItem: (key, value) => void data.set(key, value) };
}

describe('breadcrumbs', () => {
  it('hands the next session the trail this one left', () => {
    const storage = memoryStorage();
    let now = 0;
    const first = new Breadcrumbs({ storage, now: () => now });
    now = 1500;
    first.mark('globe ready');
    const second = new Breadcrumbs({ storage, now: () => now });
    expect(second.previous).toEqual(['1.5s globe ready']);
    expect(second.current).toEqual([]);
  });

  it('keeps only the newest steps', () => {
    const crumbs = new Breadcrumbs({ storage: null, now: () => 0, keep: 2 });
    crumbs.mark('a');
    crumbs.mark('b');
    crumbs.mark('c');
    expect(crumbs.current).toEqual(['0.0s b', '0.0s c']);
  });

  it('keeps 30 steps by default', () => {
    const crumbs = new Breadcrumbs({ storage: null, now: () => 0 });
    for (let step = 1; step <= 31; step += 1) crumbs.mark(`step ${step}`);
    expect(crumbs.current).toHaveLength(30);
    expect(crumbs.current[0]).toBe('0.0s step 2');
  });

  it('clears the stored trail when a session starts, even with no marks', () => {
    const storage = memoryStorage();
    storage.setItem('ventana.devtools.breadcrumbs', JSON.stringify(['0.0s old']));
    const quiet = new Breadcrumbs({ storage, now: () => 0 });
    expect(quiet.previous).toEqual(['0.0s old']);
    expect(new Breadcrumbs({ storage, now: () => 0 }).previous).toEqual([]);
  });

  it('never throws when storage is broken or holds garbage', () => {
    const broken: TrailStorage = {
      getItem: () => '{not json',
      setItem: () => {
        throw new Error('quota exceeded');
      },
    };
    const crumbs = new Breadcrumbs({ storage: broken, now: () => 0 });
    expect(crumbs.previous).toEqual([]);
    expect(() => crumbs.mark('still fine')).not.toThrow();
  });

  it('marks a lost and a restored WebGL context', () => {
    const canvas = new EventTarget();
    const crumbs = new Breadcrumbs({ storage: null, now: () => 0 });
    const events: string[] = [];
    watchContext(canvas, crumbs, (event) => events.push(event));
    canvas.dispatchEvent(new Event('webglcontextlost'));
    canvas.dispatchEvent(new Event('webglcontextrestored'));
    expect(events).toEqual(['lost', 'restored']);
    expect(crumbs.current).toEqual(['0.0s context lost', '0.0s context restored']);
  });
});

describe('trail storage', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function holding(value: string): TrailStorage {
    return { getItem: () => value, setItem: () => undefined };
  }

  it('reads valid JSON that is not an array as no trail', () => {
    expect(readTrail(holding('{"a":1}'), 'key')).toEqual([]);
  });

  it('reads the entries of a stored array as strings', () => {
    expect(readTrail(holding('[1,2]'), 'key')).toEqual(['1', '2']);
  });

  it('has no default storage where the page has none', () => {
    vi.stubGlobal('localStorage', undefined);
    expect(defaultStorage()).toBeNull();
  });
});
