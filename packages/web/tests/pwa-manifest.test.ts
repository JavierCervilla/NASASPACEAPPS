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
 * The web app manifests (VENT-28): one per offered locale, installed in that locale's route and language, with the
 * install icons and the shortcuts to the featured sites; and the `?site=` parameter those shortcuts open.
 */
import { describe, expect, it } from 'vitest';
import curated from '../../server/data/sites.json';
import { LOCALES, type Locale } from '../src/i18n/locales';
import { localSite } from '../src/i18n/site-names';
import { siteFromSearch } from '../src/lib/site-param';
import { FEATURED_SITES, webManifest } from '../src/pwa/manifest';
import { manifestResponse } from '../src/pwa/manifest-route';
import { i18nOf } from './i18n-factories';

const manifestOf = (locale: Locale, base = '/') => {
  const i18n = i18nOf(locale);
  return webManifest({ locale, base, i18n, sites: curated.map((s) => localSite(i18n, s)) });
};

describe('webManifest', () => {
  it.each(LOCALES.map((l) => [l, l === 'en' ? '/' : `/${l}/`]))('%s starts and stays in %s', (locale, home) => {
    const manifest = manifestOf(locale);
    expect(manifest.start_url).toBe(home);
    expect(manifest.scope).toBe(home);
    expect(manifest.id).toBe(home);
    expect(manifest.lang).toBe(locale);
    expect(manifest.name).toBe('Ventana Lunar');
    expect(manifest.display).toBe('standalone');
    expect(manifest.description).toBe(i18nOf(locale).t('manifest.description'));
  });

  it('describes each locale in its own words', () => {
    const descriptions = new Set(LOCALES.map((l) => manifestOf(l).description));
    expect(descriptions.size).toBe(LOCALES.length);
  });

  it('matches the page’s near-black and lists the any and maskable icons', () => {
    const manifest = manifestOf('en');
    expect(manifest.background_color).toBe('#07080b');
    expect(manifest.theme_color).toBe('#07080b');
    expect(manifest.icons.map((i) => [i.src, i.sizes, i.purpose])).toEqual([
      ['/icons/icon-192.png', '192x192', 'any'],
      ['/icons/icon-512.png', '512x512', 'any'],
      ['/icons/icon-maskable-512.png', '512x512', 'maskable'],
    ]);
  });

  it('opens each featured site from a shortcut, in the locale’s route and words', () => {
    const shortcuts = manifestOf('es').shortcuts;
    expect(shortcuts.map((s) => s.url)).toEqual(FEATURED_SITES.map((id) => `/es/?site=${id}`));
    expect(shortcuts[0]).toMatchObject({ name: 'Mons Mouton (IM-2 Athena)', short_name: 'IM-2' });
    expect(shortcuts.map((s) => s.name).join(' ')).toContain('cráter Shackleton');
  });

  it('keeps every address under SITE_BASE', () => {
    const manifest = manifestOf('de', '/ventana/');
    expect(manifest.start_url).toBe('/ventana/de/');
    expect(manifest.icons[0]?.src).toBe('/ventana/icons/icon-192.png');
    expect(manifest.shortcuts[0]?.url).toBe('/ventana/de/?site=im2-athena');
  });

  it('is served with the manifest media type', async () => {
    const response = manifestResponse('it', '/');
    expect(response.headers.get('content-type')).toBe('application/manifest+json');
    expect((await response.json()).start_url).toBe('/it/');
  });
});

describe('siteFromSearch', () => {
  const ids = curated.map((s) => s.id);

  it('opens a curated site the link names', () => {
    expect(siteFromSearch('?site=apollo11', ids)).toBe('apollo11');
    expect(siteFromSearch('?glass=frosted&site=change7-target', ids)).toBe('change7-target');
  });

  it('ignores an unknown, empty or missing site', () => {
    expect(siteFromSearch('?site=atlantis', ids)).toBeNull();
    expect(siteFromSearch('?site=', ids)).toBeNull();
    expect(siteFromSearch('', ids)).toBeNull();
  });
});
