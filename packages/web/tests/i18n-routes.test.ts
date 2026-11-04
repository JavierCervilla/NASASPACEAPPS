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
 * Where each locale lives and how a visitor gets there (VENT-35): the
 * routes and their hreflang links, the first-visit redirect of `/`, the
 * kept choice, the switch from the selector, the menu's keys and the
 * phone's push spring.
 */
import { describe, expect, it, vi } from 'vitest';
import { CHOICE_KEY, readChoice, saveChoice } from '../src/i18n/choice';
import { firstVisit, firstVisitScript, type FirstVisitWindow } from '../src/i18n/first-visit';
import { isLocale, LOCALES } from '../src/i18n/locales';
import { alternates, canonicalHref, localePath } from '../src/i18n/routes';
import { localeHref, switchLocale } from '../src/i18n/switch';
import { menuIndex } from '../src/lib/menu-keys';
import { createPush } from '../src/lib/push-motion';

/** A storage in memory; `refuse` makes every call throw, as a blocked one does. */
function memoryStorage(refuse = false) {
  const items = new Map<string, string>();
  return {
    items,
    getItem: (key: string) => {
      if (refuse) throw new Error('SecurityError');
      return items.get(key) ?? null;
    },
    setItem: (key: string, value: string) => {
      if (refuse) throw new Error('SecurityError');
      items.set(key, value);
    },
  };
}

const CONFIG = { base: '/', locales: LOCALES, choiceKey: CHOICE_KEY, seenKey: `${CHOICE_KEY}.seen` };

function visit(languages: string[], storage = memoryStorage(), hash = '') {
  const replace = vi.fn();
  const win: FirstVisitWindow = { localStorage: storage, navigator: { languages }, location: { search: '', hash, replace } };
  firstVisit(win, CONFIG);
  return replace;
}

describe('routes', () => {
  it('puts English at the root and every other locale in its folder', () => {
    expect(localePath('/', 'en')).toBe('/');
    expect(localePath('/', 'es')).toBe('/es/');
    expect(localePath('/ventana', 'fr')).toBe('/ventana/fr/');
    expect(localePath('/', 'en-XA')).toBe('/en-xa/');
  });

  it('links every locale and x-default, absolute when the site is known', () => {
    expect(alternates('/').map(({ hreflang }) => hreflang)).toEqual(['en', 'es', 'fr', 'de', 'it', 'x-default']);
    expect(alternates('/').at(-1)?.href).toBe('/');
    expect(alternates('/', new URL('https://ventana.example')).find((a) => a.hreflang === 'de')?.href).toBe(
      'https://ventana.example/de/',
    );
  });

  it('names the canonical page on the primary domain, none without one (VENT-76)', () => {
    const site = new URL('https://nasa.universelle.io');
    expect(canonicalHref('/', 'en', site)).toBe('https://nasa.universelle.io/');
    expect(canonicalHref('/', 'es', site)).toBe('https://nasa.universelle.io/es/');
    expect(canonicalHref('/', 'es')).toBeNull();
  });

  it('knows the offered locales only', () => {
    expect(isLocale('it')).toBe(true);
    expect(isLocale('en-XA')).toBe(false);
    expect(isLocale(null)).toBe(false);
  });
});

describe('the first visit to /', () => {
  it('opens the best of the browser’s languages, once', () => {
    const storage = memoryStorage();
    expect(visit(['es-ES', 'en'], storage)).toHaveBeenCalledWith('/es/');
    expect(visit(['es-ES', 'en'], storage)).not.toHaveBeenCalled();
  });

  it('skips languages it does not offer and keeps the view', () => {
    expect(visit(['pt-BR', 'de-AT'], memoryStorage(), '#polar-map')).toHaveBeenCalledWith('/de/#polar-map');
  });

  it('stays on English for an English browser or an unknown language', () => {
    expect(visit(['en-US', 'fr'])).not.toHaveBeenCalled();
    expect(visit(['ja'])).not.toHaveBeenCalled();
  });

  it('opens a kept choice on every visit, ahead of the browser', () => {
    const storage = memoryStorage();
    storage.items.set(CHOICE_KEY, 'it');
    storage.items.set(`${CHOICE_KEY}.seen`, '1');
    expect(visit(['es'], storage)).toHaveBeenCalledWith('/it/');
    storage.items.set(CHOICE_KEY, 'en');
    expect(visit(['es'], storage)).not.toHaveBeenCalled();
  });

  it('stays on English without storage: it could not remember choosing', () => {
    expect(visit(['es'], memoryStorage(true))).not.toHaveBeenCalled();
  });

  it('runs as the inline script the page carries', () => {
    const replace = vi.fn();
    const win = { localStorage: memoryStorage(), navigator: { languages: ['fr-CA'] }, location: { search: '?q=1', hash: '#globe', replace } };
    new Function('window', firstVisitScript('/base'))(win);
    expect(replace).toHaveBeenCalledWith('/base/fr/?q=1#globe');
  });
});

describe('the kept choice and the switch', () => {
  it('keeps and reads a choice, and survives a refusing storage', () => {
    const storage = memoryStorage();
    saveChoice(storage, 'de');
    expect(readChoice(storage)).toBe('de');
    expect(readChoice(null)).toBeNull();
    expect(() => saveChoice(memoryStorage(true), 'de')).not.toThrow();
    expect(readChoice(memoryStorage(true))).toBeNull();
  });

  it('opens the chosen locale on the same view, and keeps the choice', () => {
    const storage = memoryStorage();
    const assign = vi.fn();
    const leaving = vi.fn();
    switchLocale('/', 'fr', { storage, location: { search: '', hash: '#polar-map', assign }, leaving });
    expect(assign).toHaveBeenCalledWith('/fr/#polar-map');
    expect(leaving).toHaveBeenCalledOnce();
    expect(leaving.mock.invocationCallOrder[0]).toBeLessThan(assign.mock.invocationCallOrder[0] ?? 0);
    expect(storage.items.get(CHOICE_KEY)).toBe('fr');
    expect(localeHref('/', 'en', { search: '', hash: '' })).toBe('/');
  });

  it('keeps the shown site, the pin\'s point, the glass and the on-foot diagnostics, and drops any other parameter', () => {
    const search = '?utm_source=x&site=shackleton-rim&lat=-85.87&lon=61.34&glass=frosted&onfoot=far&q=1';
    expect(localeHref('/', 'es', { search, hash: '#globe' })).toBe(
      '/es/?site=shackleton-rim&lat=-85.87&lon=61.34&glass=frosted&onfoot=far#globe',
    );
    expect(localeHref('/base', 'de', { search: '?q=1', hash: '' })).toBe('/base/de/');
  });

  it('keeps ?debug, bare or with a value, so the dev tools stay on in the other language (VENT-49)', () => {
    expect(localeHref('/', 'es', { search: '?debug', hash: '#horizon' })).toBe('/es/?debug=#horizon');
    expect(localeHref('/', 'fr', { search: '?site=im-2&debug=1', hash: '' })).toBe('/fr/?site=im-2&debug=1');
  });
});

describe('menu keys', () => {
  it('moves and wraps with the arrows, and jumps with Home and End', () => {
    expect(menuIndex('ArrowDown', 4, 5)).toBe(0);
    expect(menuIndex('ArrowUp', 0, 5)).toBe(4);
    expect(menuIndex('ArrowUp', -1, 5)).toBe(4);
    expect(menuIndex('Home', 3, 5)).toBe(0);
    expect(menuIndex('End', 0, 5)).toBe(4);
    expect(menuIndex('a', 0, 5)).toBeNull();
    expect(menuIndex('ArrowDown', 0, 0)).toBeNull();
  });
});

describe('the push spring', () => {
  /** Runs the spring on a fake 60 Hz clock until it rests. */
  function run(push: ReturnType<typeof createPush>, frames: ((t: number) => void)[], target: 0 | 1) {
    push.to(target);
    for (let t = 0; frames.length > 0 && t < 5000; t += 16) frames.shift()!(t);
  }

  it('springs to the page and back without overshoot, and rests', () => {
    const frames: ((t: number) => void)[] = [];
    const values: number[] = [];
    const push = createPush({ frame: (cb) => frames.push(cb), cancel: vi.fn(), onValue: (v) => values.push(v) });
    run(push, frames, 1);
    expect(values.at(-1)).toBe(1);
    expect(Math.max(...values)).toBeLessThanOrEqual(1);
    run(push, frames, 0);
    expect(values.at(-1)).toBe(0);
    expect(frames).toHaveLength(0);
  });
  it('lands in the spring\'s own time even at a few frames a second', () => {
    const frames: ((t: number) => void)[] = [];
    const values: number[] = [];
    const push = createPush({ frame: (cb) => frames.push(cb), cancel: vi.fn(), onValue: (v) => values.push(v) });
    push.to(1);
    let t = 0;
    while (frames.length > 0 && t < 5000) {
      frames.shift()!(t);
      t += 250;
    }
    expect(values.at(-1)).toBe(1);
    expect(t).toBeLessThanOrEqual(1500);
  });
});
