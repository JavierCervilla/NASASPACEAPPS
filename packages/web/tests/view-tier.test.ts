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
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Tier } from '../src/lib/quality';
import { createViewTier } from '../src/terrain/view-tier';
import { keptTier, tierStorage, type TierStorage } from '../src/terrain/view-tier-memory';
import { leftOnPurpose } from '../src/terrain/view-tier-open';

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

const pageListeners = new Map<string, Set<(event: Event) => void>>();

// The view's marks listen to the page (`pagehide`) and beat on a timer.
beforeEach(() => {
  vi.useFakeTimers();
  pageListeners.clear();
  vi.stubGlobal('addEventListener', (type: string, fn: (event: Event) => void) => {
    pageListeners.set(type, (pageListeners.get(type) ?? new Set()).add(fn));
  });
  vi.stubGlobal('removeEventListener', (type: string, fn: (event: Event) => void) => void pageListeners.get(type)?.delete(fn));
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

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

const DIED = 'tier dropped to medium: previous run ended without unmount';

/** A page's run of the view: opened, and closed unless the page dies. */
function run(view: ReturnType<typeof store>['view'], dies: boolean): string | null {
  const note = view.opened();
  if (!dies) view.closed();
  return note;
}

// VENT-51: a Pixel's page died with the view open (no loss recorded, no unmount), and the next run opened at the same
// tier, because nothing had been recorded to step down from.
describe('a run that ended without unmount', () => {
  it('starts the next page\'s view one rung lower, kept, and says why once', () => {
    const memory = storage();
    expect(run(store('high', { kept: memory }).view, true)).toBeNull();
    const next = store('high', { kept: memory }).view;
    expect(next.get()).toEqual({ tier: 'medium', steppable: true });
    expect(memory.items.get(KEY)).toBe('medium');
    expect(next.opened()).toBe(DIED);
    expect(next.opened()).toBeNull();
  });

  it('does not step down after a run that closed: leaving the view, a tier switch or a loss inside it', () => {
    const memory = storage();
    run(store('high', { kept: memory }).view, false);
    const next = store('high', { kept: memory }).view;
    expect(next.get().tier).toBe('high');
    expect(next.opened()).toBeNull();
    next.stepDown();
    next.closed();
    expect(store('high', { kept: memory }).view.get().tier).toBe('medium');
  });

  it('steps down once per died run, not again on the page after', () => {
    const memory = storage();
    run(store('high', { kept: memory }).view, true);
    expect(run(store('high', { kept: memory }).view, false)).toBe(DIED);
    const third = store('high', { kept: memory }).view;
    expect(third.get().tier).toBe('medium');
    expect(third.opened()).toBeNull();
  });

  it('steps down again when the next run dies too, never below low', () => {
    const memory = storage();
    run(store('high', { kept: memory }).view, true);
    run(store('high', { kept: memory }).view, true);
    const third = store('high', { kept: memory }).view;
    expect(third.get().tier).toBe('low');
    run(third, true);
    const fourth = store('high', { kept: memory }).view;
    expect(fourth.get().tier).toBe('low');
    expect(fourth.opened()).toBeNull();
  });

  it('does not step down after a page the app left on purpose with the view open (VENT-52)', () => {
    const memory = storage();
    expect(run(store('high', { kept: memory }).view, true)).toBeNull();
    leftOnPurpose(memory);
    const next = store('high', { kept: memory }).view;
    expect(next.get().tier).toBe('high');
    expect(next.opened()).toBeNull();
  });

  it('never steps down a tier the address forced', () => {
    const memory = storage();
    run(store('high', { kept: memory }).view, true);
    const forced = store('high', { forced: true, kept: memory }).view;
    expect(forced.get()).toEqual({ tier: 'high', steppable: false });
    expect(forced.opened()).toBeNull();
  });

  it('costs nothing but the memory when the storage throws or is missing', () => {
    for (const kept of [storage(true), null]) {
      const view = store('high', { kept }).view;
      expect(run(view, true)).toBeNull();
      expect(store('high', { kept }).view.get().tier).toBe('high');
    }
  });
});

// VENT-69: Chrome blocks WebGL until it restarts, and a restart empties the session's storage. The mark is per tab,
// beats while the view is open, and a close or a navigation (`pagehide`) takes it away: only a page that died counts.
describe('the open mark in localStorage', () => {
  const HOUR = 60 * 60 * 1000;
  const clock = { now: 1_000_000 };

  beforeEach(() => {
    clock.now = 1_000_000;
  });

  /** A page: its own session storage (its tab), the shared `local`, the shared clock. */
  function page(local: TierStorage | null, session: TierStorage = storage()) {
    const start = () => ({ tier: 'high' as Tier, forced: false });
    return createViewTier({ start, storage: () => session, local: () => local, nowMs: () => clock.now });
  }
  const pass = (ms: number): void => {
    clock.now += ms;
    vi.advanceTimersByTime(ms);
  };
  const pagehide = (): void => pageListeners.get('pagehide')?.forEach((fn) => fn(new Event('pagehide')));

  it('survives a browser restart after a page that died: the next session starts a rung lower, once', () => {
    const local = storage();
    page(local).opened();
    clock.now += 2 * HOUR;
    const next = page(local);
    expect(next.get().tier).toBe('medium');
    expect(next.opened()).toBe(DIED);
  });

  it('expires after 24 hours', () => {
    const local = storage();
    page(local).opened();
    clock.now += 24 * HOUR - 1;
    expect(page(local).get().tier).toBe('medium');
    clock.now += 2;
    expect(page(local).get().tier).toBe('high');
  });

  it('is cleared when the view unmounts, and by leaving on purpose', () => {
    const local = storage();
    const session = storage();
    const first = page(local, session);
    first.opened();
    first.closed();
    clock.now += HOUR;
    expect(page(local).get().tier).toBe('high');
    page(local, session).opened();
    leftOnPurpose(session, local);
    clock.now += HOUR;
    expect(page(local).get().tier).toBe('high');
  });

  it('is not a death when the page closes or navigates away (pagehide), a browser restart or not', () => {
    const local = storage();
    page(local).opened();
    pagehide();
    clock.now += HOUR;
    expect(page(local).get().tier).toBe('high');
  });

  it('does not count a tab that is still open: its beat keeps the mark fresh', () => {
    const local = storage();
    page(local).opened();
    pass(60_000);
    const second = page(local);
    expect(second.get().tier).toBe('high');
    expect(second.opened()).toBeNull();
  });

  it('keeps every tab\'s mark: one tab leaving does not clear another\'s, which then dies', () => {
    const local = storage();
    const a = page(local);
    a.opened();
    const b = page(local);
    b.opened();
    b.closed();
    pagehide();
    a.opened();
    vi.clearAllTimers();
    clock.now += HOUR;
    expect(page(local).get().tier).toBe('medium');
  });

  it('ignores a value that is no map of times, and a storage that throws', () => {
    clock.now = 1_000_000;
    for (const value of ['true', '', 'null', '[1]', '{"t1":"x"}', '{"t1":-5}']) {
      expect(page(storage(false, { 'ventana.onFootOpen': value })).get().tier).toBe('high');
    }
    expect(page(storage(true)).get().tier).toBe('high');
    expect(page(null).get().tier).toBe('high');
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
