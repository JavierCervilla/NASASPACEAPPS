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
 * The sites saved on this device (VENT-37): the versioned schema read back
 * with every bad entry dropped, the cap, names cleaned, rename, delete and
 * its undo, and storage that refuses or is missing.
 */
import { describe, expect, it, vi } from 'vitest';
import {
  cleanName,
  NAME_MAX,
  parseSaved,
  SAVED_CAP,
  serializeSaved,
  type SavedSite,
} from '../src/saved/saved-schema';
import { createSavedSites, SAVED_KEY } from '../src/saved/saved-sites';
import { createUndo } from '../src/saved/undo';

/** A storage that keeps strings in a map. */
function memoryStorage(initial: Record<string, string> = {}) {
  const kept = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => kept.get(key) ?? null,
    setItem: (key: string, value: string) => void kept.set(key, value),
    kept,
  };
}

const refusing = {
  getItem: () => {
    throw new Error('denied');
  },
  setItem: () => {
    throw new Error('denied');
  },
};

const RIM = { lat: -85.87, lonEast: 61.34 };
const RIDGE = { lat: -84.2, lonEast: -40 };

/** A valid saved entry at `point`. */
function entry(point: { lat: number; lonEast: number }, name = 'Rim'): SavedSite {
  const id = `@${point.lat.toFixed(2)},${point.lonEast.toFixed(2)}`;
  return { id, name, lat: point.lat, lonEast: point.lonEast, savedAt: 1 };
}

describe('the saved sites schema', () => {
  it('reads back what it writes', () => {
    const sites = [entry(RIM), entry(RIDGE, 'Ridge')];
    expect(parseSaved(serializeSaved(sites))).toEqual(sites);
  });

  it('reads nothing from missing, broken or unknown data', () => {
    expect(parseSaved(null)).toEqual([]);
    expect(parseSaved('{not json')).toEqual([]);
    expect(parseSaved('[]')).toEqual([]);
    expect(parseSaved(JSON.stringify({ v: 2, sites: [entry(RIM)] }))).toEqual([]);
    expect(parseSaved(JSON.stringify({ v: 1, sites: 'x' }))).toEqual([]);
  });

  it('drops each bad entry and keeps the good ones', () => {
    const good = entry(RIM);
    const bad = [
      null,
      'Rim',
      { ...good, id: '@1.00,2.00' },
      { ...good, lat: 91, id: '@91.00,61.34' },
      { ...good, lat: Number.NaN },
      { ...good, lonEast: '61.34' },
      { ...good, name: '' },
      { ...good, name: 42 },
      { ...good, name: 'x'.repeat(NAME_MAX + 1) },
      { ...good, savedAt: 'today' },
      { ...good, id: '@-85.871,61.34', lat: -85.871 },
    ];
    const text = JSON.stringify({ v: 1, sites: [...bad, good] });
    expect(parseSaved(text)).toEqual([good]);
  });

  it('keeps the first of two entries at one point, and at most the cap', () => {
    const many = Array.from({ length: SAVED_CAP + 5 }, (_, i) =>
      entry({ lat: -80 - i / 10, lonEast: 10 }, `Site ${i}`));
    const text = JSON.stringify({ v: 1, sites: [entry(RIM, 'A'), entry(RIM, 'B'), ...many] });
    const read = parseSaved(text);
    expect(read).toHaveLength(SAVED_CAP);
    expect(read[0]?.name).toBe('A');
  });

  it('cleans a name: spaces folded, control characters out, length capped', () => {
    expect(cleanName('  Near \n Nobile\tRim 1 ')).toBe('Near Nobile Rim 1');
    expect(cleanName('a\u0000b')).toBe('ab');
    expect(cleanName('   ')).toBeNull();
    expect(cleanName('x'.repeat(NAME_MAX + 9))).toHaveLength(NAME_MAX);
  });
});

describe('the saved sites store', () => {
  it('saves a point under its grid id, newest first, and keeps it', () => {
    const storage = memoryStorage();
    const saved = createSavedSites(storage, () => 5);
    expect(saved.save(RIDGE, 'Ridge').kind).toBe('saved');
    const result = saved.save({ lat: -85.8712, lonEast: 61.3449 }, 'Rim');
    expect(result).toEqual({ kind: 'saved', site: { ...entry(RIM), savedAt: 5 } });
    expect(saved.get().map(({ name }) => name)).toEqual(['Rim', 'Ridge']);
    expect(saved.find('@-85.87,61.34')?.name).toBe('Rim');
    expect(parseSaved(storage.kept.get(SAVED_KEY) ?? null)).toEqual(saved.get());
    expect(createSavedSites(storage, () => 9).get()).toEqual(saved.get());
  });

  it('does not save one point twice, nor an empty name', () => {
    const saved = createSavedSites(memoryStorage(), () => 1);
    saved.save(RIM, 'Rim');
    expect(saved.save(RIM, 'Again').kind).toBe('exists');
    expect(saved.save(RIDGE, '  ').kind).toBe('invalid');
    expect(saved.get()).toHaveLength(1);
  });

  it('refuses a save over the cap', () => {
    const saved = createSavedSites(memoryStorage(), () => 1);
    for (let i = 0; i < SAVED_CAP; i++) saved.save({ lat: -80 - i / 10, lonEast: 0 }, `S${i}`);
    expect(saved.save(RIM, 'One more')).toEqual({ kind: 'full' });
    expect(saved.get()).toHaveLength(SAVED_CAP);
  });

  it('renames, keeping the old name for an empty one', () => {
    const saved = createSavedSites(memoryStorage(), () => 1);
    saved.save(RIM, 'Rim');
    saved.rename('@-85.87,61.34', '  Shackleton  rim ');
    expect(saved.get()[0]?.name).toBe('Shackleton rim');
    saved.rename('@-85.87,61.34', ' ');
    expect(saved.get()[0]?.name).toBe('Shackleton rim');
  });

  it('deletes and puts back in the same place', () => {
    const saved = createSavedSites(memoryStorage(), () => 1);
    saved.save(RIDGE, 'Ridge');
    saved.save(RIM, 'Rim');
    const listener = vi.fn();
    saved.subscribe(listener);
    const removed = saved.remove('@-84.20,-40.00');
    expect(saved.get().map(({ name }) => name)).toEqual(['Rim']);
    expect(saved.restore(removed!)).toBe(true);
    expect(saved.get().map(({ name }) => name)).toEqual(['Rim', 'Ridge']);
    expect(saved.restore(removed!)).toBe(false);
    expect(saved.remove('@0.00,0.00')).toBeNull();
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('works on for the page when storage refuses or is missing', () => {
    for (const storage of [refusing, null]) {
      const saved = createSavedSites(storage, () => 1);
      expect(saved.save(RIM, 'Rim').kind).toBe('saved');
      expect(saved.get()).toHaveLength(1);
    }
  });
});

describe('the undo of a delete', () => {
  /** A clock whose timers run when `run` says. */
  function manualTimers() {
    const pending: { fn: () => void; ms: number; off: boolean }[] = [];
    const after = (fn: () => void, ms: number) => {
      const timer = { fn, ms, off: false };
      pending.push(timer);
      return () => void (timer.off = true);
    };
    const run = () => pending.splice(0).forEach((t) => t.off || t.fn());
    return { after, run, pending };
  }

  it('offers the last delete for a while, then forgets it', () => {
    const saved = createSavedSites(memoryStorage(), () => 1);
    saved.save(RIM, 'Rim');
    const timers = manualTimers();
    const undo = createUndo(saved, timers.after);
    undo.offer(saved.remove('@-85.87,61.34')!);
    expect(undo.current.get()?.site.name).toBe('Rim');
    expect(timers.pending[0]?.ms).toBe(5000);
    timers.run();
    expect(undo.current.get()).toBeNull();
    expect(saved.get()).toHaveLength(0);
  });

  it('puts the site back on undo, once', () => {
    const saved = createSavedSites(memoryStorage(), () => 1);
    saved.save(RIM, 'Rim');
    const timers = manualTimers();
    const undo = createUndo(saved, timers.after);
    undo.offer(saved.remove('@-85.87,61.34')!);
    expect(undo.undo()).toBe(true);
    expect(saved.get()).toHaveLength(1);
    expect(undo.current.get()).toBeNull();
    expect(undo.undo()).toBe(false);
    timers.run();
    expect(saved.get()).toHaveLength(1);
  });

  it('stops the time while held, and gives it in full again when let go', () => {
    const saved = createSavedSites(memoryStorage(), () => 1);
    saved.save(RIM, 'Rim');
    const timers = manualTimers();
    const undo = createUndo(saved, timers.after);
    undo.offer(saved.remove('@-85.87,61.34')!);
    undo.hold();
    timers.run();
    expect(undo.current.get()?.site.name).toBe('Rim');
    undo.release();
    expect(timers.pending).toHaveLength(1);
    timers.run();
    expect(undo.current.get()).toBeNull();
  });

  it('a new delete replaces the offer', () => {
    const saved = createSavedSites(memoryStorage(), () => 1);
    saved.save(RIM, 'Rim');
    saved.save(RIDGE, 'Ridge');
    const timers = manualTimers();
    const undo = createUndo(saved, timers.after);
    undo.offer(saved.remove('@-85.87,61.34')!);
    undo.offer(saved.remove('@-84.20,-40.00')!);
    expect(undo.current.get()?.site.name).toBe('Ridge');
    undo.dismiss();
    expect(undo.current.get()).toBeNull();
  });
});
