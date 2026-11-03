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
 * «New version ready» (VENT-52): the worker installs with `skipWaiting` and activates with `clients.claim`, so a new
 * version takes the open page over at once and the cue is `controllerchange` on a page that already had a controller.
 * A first install, Save-Data (no worker) and a dismissed row offer nothing. The check runs when the app opens and when
 * it comes back to the foreground. The row itself is rendered on the server renderer, which runs no effect.
 */
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { I18nContext } from '../src/components/i18n-context';
import { UpdateRow } from '../src/components/UpdateNotice';
import { isNewVersion, showsUpdate, watchForUpdate, type UpdateContainer, type VisibilityDoc } from '../src/pwa/update-watch';
import { EN } from './i18n-factories';

/** A fake container whose controller and listeners the test drives. */
function fakeContainer(controlled: boolean) {
  const listeners = new Set<() => void>();
  const update = vi.fn(async () => undefined);
  const container: UpdateContainer & { controller: object | null } = {
    controller: controlled ? {} : null,
    ready: Promise.resolve({ update }),
    addEventListener: (_type, listener) => listeners.add(listener),
    removeEventListener: (_type, listener) => listeners.delete(listener),
  };
  const takeOver = (): void => {
    container.controller = {};
    for (const listener of listeners) listener();
  };
  return { container, update, takeOver, listeners };
}

/** A fake document whose visibility the test drives. */
function fakeDoc() {
  const listeners = new Set<() => void>();
  const doc: VisibilityDoc & { visibilityState: string } = {
    visibilityState: 'visible',
    addEventListener: (_type, listener) => listeners.add(listener),
    removeEventListener: (_type, listener) => listeners.delete(listener),
  };
  const show = (state: string): void => {
    doc.visibilityState = state;
    for (const listener of listeners) listener();
  };
  return { doc, show, listeners };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('isNewVersion', () => {
  it('is a new version only when the page already had a controller', () => {
    expect(isNewVersion(true, false)).toBe(true);
    expect(isNewVersion(false, false)).toBe(false);
  });

  it('is never one under Save-Data', () => {
    expect(isNewVersion(true, true)).toBe(false);
  });
});

describe('showsUpdate', () => {
  it('shows a ready update while online and not dismissed', () => {
    expect(showsUpdate({ ready: true, dismissed: false, online: true })).toBe(true);
  });

  it.each([
    ['not ready', { ready: false, dismissed: false, online: true }],
    ['dismissed', { ready: true, dismissed: true, online: true }],
    ['offline, where the offline notice holds the slot', { ready: true, dismissed: false, online: false }],
  ])('hides when %s', (_name, state) => {
    expect(showsUpdate(state)).toBe(false);
  });
});

describe('watchForUpdate', () => {
  it('offers the update when a new worker takes over a controlled page', () => {
    const { container, takeOver } = fakeContainer(true);
    const onReady = vi.fn();
    watchForUpdate({ container, saveData: false, doc: fakeDoc().doc, onReady });
    takeOver();
    expect(onReady).toHaveBeenCalledTimes(1);
  });

  it('offers nothing on the first install, then the next version', () => {
    const { container, takeOver } = fakeContainer(false);
    const onReady = vi.fn();
    watchForUpdate({ container, saveData: false, doc: fakeDoc().doc, onReady });
    takeOver();
    expect(onReady).not.toHaveBeenCalled();
    takeOver();
    expect(onReady).toHaveBeenCalledTimes(1);
  });

  it('checks for a new version when the app opens and when it comes back', async () => {
    const { container, update } = fakeContainer(true);
    const { doc, show } = fakeDoc();
    watchForUpdate({ container, saveData: false, doc, onReady: vi.fn() });
    await flush();
    expect(update).toHaveBeenCalledTimes(1);
    show('hidden');
    await flush();
    expect(update).toHaveBeenCalledTimes(1);
    show('visible');
    await flush();
    expect(update).toHaveBeenCalledTimes(2);
  });

  it('keeps quiet when the check fails (offline)', async () => {
    const { container, update } = fakeContainer(true);
    update.mockRejectedValue(new Error('offline'));
    watchForUpdate({ container, saveData: false, doc: fakeDoc().doc, onReady: vi.fn() });
    await flush();
    expect(update).toHaveBeenCalledTimes(1);
  });

  it('does nothing without a worker or under Save-Data', async () => {
    const { container, update, listeners } = fakeContainer(true);
    const { doc, listeners: docListeners } = fakeDoc();
    watchForUpdate({ container: undefined, saveData: false, doc, onReady: vi.fn() });
    watchForUpdate({ container, saveData: true, doc, onReady: vi.fn() });
    await flush();
    expect(update).not.toHaveBeenCalled();
    expect(listeners.size + docListeners.size).toBe(0);
  });

  it('lets go of its listeners when stopped', () => {
    const { container, listeners } = fakeContainer(true);
    const { doc, listeners: docListeners } = fakeDoc();
    const stop = watchForUpdate({ container, saveData: false, doc, onReady: vi.fn() });
    stop();
    expect(listeners.size + docListeners.size).toBe(0);
  });
});

/** The row's markup in English. */
function rowHtml(shown: boolean): string {
  const row = createElement(UpdateRow, { shown, onUpdate: vi.fn(), onDismiss: vi.fn() });
  return renderToStaticMarkup(createElement(I18nContext, { value: EN }, row));
}

describe('UpdateRow', () => {
  it('keeps an empty polite live region while hidden, so the change is announced', () => {
    const html = rowHtml(false);
    expect(html).toContain('role="status"');
    expect(html).not.toContain('New version ready');
    expect(html).not.toContain('<button');
  });

  it('says «New version ready» with «Update» and a named ✕', () => {
    const html = rowHtml(true);
    expect(html).toMatch(/role="status"[^>]*>New version ready</);
    expect(html).toMatch(/<button[^>]*type="button"[^>]*>Update<\/button>/);
    expect(html).toMatch(/<button[^>]*aria-label="Not now"/);
  });
});
