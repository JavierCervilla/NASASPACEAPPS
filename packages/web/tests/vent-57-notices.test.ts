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

// VENT-57 part B: the floating notices as rows of «New version ready» (variant B of V-08, V-09 and V-11), and the
// presence exit that lasts as long as the fade actually used.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { LoadButton } from '../src/components/GlobeLoad';
import { I18nContext } from '../src/components/i18n-context';
import { OfflineRow } from '../src/components/OfflineRow';
import { EXIT_MS, FADE_MS, exitMs } from '../src/components/presence';
import { anchorBottom } from '../src/components/saved/undo-anchor';
import { dismissalAfter } from '../src/pwa/offline-status';
import { rulesOf, sheet } from './css-rules';
import { EN } from './i18n-factories';

const inEnglish = (element: ReturnType<typeof createElement>) =>
  renderToStaticMarkup(createElement(I18nContext, { value: EN }, element));

describe('presence: the exit lasts as long as the fade it runs', () => {
  it('waits --dur-enter normally and --dur-fade under reduced motion', () => {
    expect(exitMs(false)).toBe(EXIT_MS);
    expect(exitMs(true)).toBe(FADE_MS);
    expect(sheet('tokens.css')).toMatch(new RegExp(`--dur-fade:\\s*${FADE_MS}ms`));
  });

  it('the reduced-motion fade of data-presence reads --dur-fade, no literal duration', () => {
    const fades = rulesOf(sheet('presence.css')).filter((rule) =>
      rule.at.some((at) => /prefers-reduced-motion:\s*reduce/.test(at)) && rule.selectors.includes('[data-presence]'));
    expect(fades.length).toBeGreaterThan(0);
    for (const rule of fades) {
      expect(rule.body).toMatch(/transition:\s*opacity var\(--dur-fade\) linear/);
      expect(rule.body).not.toMatch(/\d+m?s\b/);
    }
  });
});

describe('V-08 «Offline» row', () => {
  const row = (shown: boolean, how: string | null = 'Showing data from 23 November 2026') =>
    inEnglish(createElement(OfflineRow, { shown, phase: shown ? 'in' : 'out', how, onDismiss: vi.fn() }));

  it('keeps an empty polite live region while hidden, with no box and no button', () => {
    const html = row(false);
    expect(html).toMatch(/role="status"[^>]*><\/p>/);
    expect(html).not.toContain('<button');
    expect(html).not.toContain('data-shown');
    expect(html).not.toContain('<svg');
  });

  it('shows the cloud mark, «Offline» over the date, and the hint’s ✕ beside the words', () => {
    const html = row(true);
    expect(html).toMatch(/^<div[^>]*class="offline-notice"[^>]*data-shown/);
    expect(html).toMatch(/<svg[^>]*class="notice-row__mark"[^>]*aria-hidden="true"/);
    expect(html).toMatch(
      /role="status"[^>]*><span class="notice-row__title">Offline<\/span><span class="notice-row__how">Showing data from 23 November 2026<\/span><\/p>/,
    );
    expect(html).toMatch(/<\/p><button[^>]*class="pin-hint__close"[^>]*aria-label="Hide"/);
  });

  it('says only «Offline» when no answer was ever kept', () => {
    expect(row(true, null)).toMatch(/<span class="notice-row__title">Offline<\/span><\/p>/);
  });

  it('a ✕ holds until the app goes offline again', () => {
    expect(dismissalAfter({ dismissed: true, wasOnline: false, online: false })).toBe(true);
    expect(dismissalAfter({ dismissed: true, wasOnline: false, online: true })).toBe(true);
    expect(dismissalAfter({ dismissed: true, wasOnline: true, online: false })).toBe(false);
    expect(dismissalAfter({ dismissed: false, wasOnline: true, online: false })).toBe(false);
  });
});

describe('V-09 «Load the 3D globe» row under Save-Data', () => {
  it('is one button, the whole row, named by its title and described by «Data saver is on»', () => {
    const html = inEnglish(createElement(LoadButton, { onLoad: vi.fn() }));
    const button = /^<button[^>]*class="globe-load"[^>]*>(.*)<\/button>$/.exec(html);
    expect(button?.[0]).toMatch(/aria-label="Load the 3D globe"/);
    const described = /aria-describedby="([^"]+)"/.exec(button?.[0] ?? '')?.[1];
    expect(button?.[1]).toContain(`id="${described}" class="notice-row__how">Data saver is on<`);
    expect(button?.[1]).toMatch(/<svg[^>]*class="notice-row__mark"[^>]*aria-hidden="true"/);
    expect(button?.[1]).toContain('class="notice-row__title">Load the 3D globe<');
    expect(button?.[1]).not.toContain('<button');
  });
});

describe('V-11 the undo row stands above what it would cover', () => {
  it('sits a gap above the highest visible anchor (the strip or the tab bar)', () => {
    expect(anchorBottom(900, [{ top: 640, height: 240 }])).toBe(900 - 640 + 12);
    expect(anchorBottom(844, [{ top: 0, height: 0 }, { top: 760, height: 64 }])).toBe(844 - 760 + 12);
  });

  it('has no anchor when none shows', () => {
    expect(anchorBottom(900, [])).toBeNull();
    expect(anchorBottom(900, [{ top: 0, height: 0 }])).toBeNull();
  });
});
