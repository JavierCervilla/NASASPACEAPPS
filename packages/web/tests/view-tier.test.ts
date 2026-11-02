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
 * The on-foot view's tier for the page session (VENT-49): it starts at the
 * device's tier, steps down one rung at a time, drops to low after a lost
 * context even when the address forced a tier, is remembered in the
 * session's storage, and loses only that memory when the storage is broken.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Tier } from '../src/lib/quality';
import { createViewTier } from '../src/terrain/view-tier';
import { keptTier, tierStorage, type TierStorage } from '../src/terrain/view-tier-memory';

const KEY = 'ventana.onFootTier';

/** In-memory session storage; `broken` throws on every call, as a refused storage does. */
function storage(broken = false, items: Record<string, string> = {}): TierStorage & { items: Map<string, string> } {
  const kept = new Map(Object.entries(items));
  const refuse = (): never => {
    throw new Error('storage refused');
  };
  return {
    items: kept,
    getItem: broken ? refuse : (key) => kept.get(key) ?? null,
    setItem: broken ? refuse : (key, value) => void kept.set(key, value),
  };
}

function store(tier: Tier, options: { forced?: boolean; kept?: TierStorage | null } = {}) {
  const start = vi.fn(() => ({ tier, forced: options.forced ?? false }));
  const kept = options.kept === undefined ? storage() : options.kept;
  return { start, view: createViewTier({ start, storage: () => kept }) };
}

describe('the view tier', () => {
  it('starts at the device\'s tier, read once and only when first asked', () => {
    const { start, view } = store('medium');
    expect(start).not.toHaveBeenCalled();
    expect(view.get()).toEqual({ tier: 'medium', steppable: true });
    expect(view.get()).toBe(view.get());
    expect(start).toHaveBeenCalledTimes(1);
  });

  it('steps down one rung per call and stops at low', () => {
    const { view } = store('high');
    view.stepDown();
    expect(view.get().tier).toBe('medium');
    view.stepDown();
    expect(view.get()).toEqual({ tier: 'low', steppable: false });
    view.stepDown();
    expect(view.get().tier).toBe('low');
  });

  it('never steps down a tier the address forced, and says it cannot', () => {
    const { view } = store('high', { forced: true });
    view.stepDown();
    expect(view.get()).toEqual({ tier: 'high', steppable: false });
  });

  it('drops to low after a lost context, a forced tier included', () => {
    const forced = store('high', { forced: true });
    forced.view.afterLoss();
    expect(forced.view.get()).toEqual({ tier: 'low', steppable: false });
    const free = store('medium');
    free.view.afterLoss();
    expect(free.view.get().tier).toBe('low');
  });

  it('tells its listeners of each change and of no other', () => {
    const { view } = store('high');
    const heard = vi.fn();
    view.subscribe(heard);
    view.stepDown();
    view.afterLoss();
    expect(heard).toHaveBeenCalledTimes(2);
    view.afterLoss();
    view.stepDown();
    expect(heard).toHaveBeenCalledTimes(2);
  });

  it('stops telling a listener that left', () => {
    const { view } = store('high');
    const heard = vi.fn();
    view.subscribe(heard)();
    view.stepDown();
    expect(heard).not.toHaveBeenCalled();
  });

  it('keeps the tier for the session, and starts there next time', () => {
    const memory = storage();
    store('high', { kept: memory }).view.stepDown();
    expect(memory.items.get(KEY)).toBe('medium');
    expect(store('high', { kept: memory }).view.get().tier).toBe('medium');
    store('high', { kept: memory }).view.afterLoss();
    expect(memory.items.get(KEY)).toBe('low');
  });

  it('never starts higher than the device now allows, or on a kept word it does not know', () => {
    expect(store('low', { kept: storage(false, { [KEY]: 'high' }) }).view.get().tier).toBe('low');
    expect(store('high', { kept: storage(false, { [KEY]: 'ultra' }) }).view.get().tier).toBe('high');
  });

  it('lets the address win over the memory when it forces a tier', () => {
    const memory = storage(false, { [KEY]: 'low' });
    expect(store('high', { forced: true, kept: memory }).view.get().tier).toBe('high');
  });

  it('survives a storage that throws, or none: only the memory is lost', () => {
    const broken = store('high', { kept: storage(true) });
    expect(broken.view.get().tier).toBe('high');
    broken.view.stepDown();
    expect(broken.view.get().tier).toBe('medium');
    const none = store('high', { kept: null });
    none.view.afterLoss();
    expect(none.view.get().tier).toBe('low');
    expect(keptTier(storage(true))).toBeNull();
  });
});

describe('the session storage', () => {
  afterEach(() => {
    Reflect.deleteProperty(globalThis, 'sessionStorage');
  });

  it('is none when the browser refuses access to it', () => {
    Object.defineProperty(globalThis, 'sessionStorage', {
      configurable: true,
      get: () => {
        throw new Error('blocked');
      },
    });
    expect(tierStorage()).toBeNull();
  });

  it('is the browser\'s when it is there', () => {
    const memory = storage();
    Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: memory });
    expect(tierStorage()).toBe(memory);
  });
});
