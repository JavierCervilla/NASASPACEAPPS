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
 * The message catalogues (VENT-35): every locale has exactly the English
 * keys, the same placeholders in every message, the plural forms its
 * language needs, and a translation for every free text of the site data.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { PluralForms } from '../src/i18n/catalogue';
import { CATALOGUES, catalogueOf } from '../src/i18n/catalogues';
import { formatStatusDate, missionLine } from '../src/card/site-facts';
import { dataText } from '../src/i18n/data-text';
import { localName, localSite } from '../src/i18n/site-names';
import { FORMAT_TAGS, LOCALES } from '../src/i18n/locales';
import { pseudoText } from '../src/i18n/pseudo';
import { EN, i18nOf } from './i18n-factories';

const english = CATALOGUES.en;
const placeholders = (text: string): string[] => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]!).sort();
const textsOf = (value: string | PluralForms): string[] => (typeof value === 'string' ? [value] : Object.values(value));

describe.each(LOCALES.filter((locale) => locale !== 'en'))('the %s catalogue', (locale) => {
  const catalogue = CATALOGUES[locale];

  it('has exactly the English keys', () => {
    expect(Object.keys(catalogue).sort()).toEqual(Object.keys(english).sort());
  });

  it('keeps every placeholder of every message, and adds none', () => {
    for (const [key, value] of Object.entries(english)) {
      const wanted = placeholders(textsOf(value)[0]!);
      for (const text of textsOf(catalogue[key as keyof typeof english])) {
        expect(placeholders(text), `${locale} ${key}`).toEqual(wanted);
      }
    }
  });

  it('is a plain text where English is, and plural forms where English has them', () => {
    for (const [key, value] of Object.entries(english)) {
      expect(typeof catalogue[key as keyof typeof english], `${locale} ${key}`).toBe(typeof value);
    }
  });

  // VENT-44: the subtitles and the phone's «Sun + Earth = window» rule start with a capital, after any opening mark.
  it('starts its subtitles and the phone rule with a capital letter', () => {
    for (const key of ['page.title', 'page.description', 'header.subtitle', 'rule.sun'] as const) {
      const first = (catalogue[key] as string).replace(/^[¿¡«"“\s]+/u, '').charAt(0);
      expect(first, `${locale} ${key}`).toBe(first.toLocaleUpperCase(locale));
    }
  });

  it('leaves no message empty or untranslated by accident', () => {
    for (const [key, value] of Object.entries(catalogue)) {
      for (const text of textsOf(value)) expect(text.trim(), `${locale} ${key}`).not.toBe('');
    }
  });
});

describe('plural forms', () => {
  it.each(LOCALES)('%s has every category its language uses, and no other', (locale) => {
    const needed = new Intl.PluralRules(FORMAT_TAGS[locale]).resolvedOptions().pluralCategories.slice().sort();
    for (const [key, value] of Object.entries(CATALOGUES[locale])) {
      if (typeof value === 'string') continue;
      expect(Object.keys(value).sort(), `${locale} ${key}`).toEqual(needed);
    }
  });

  it('picks the form by count', () => {
    expect(EN.plural('polar.sharedPlace', 1, { place: 'Nobile' })).toBe('Nobile · 1 site');
    expect(EN.plural('polar.sharedPlace', 3, { place: 'Nobile' })).toBe('Nobile · 3 sites');
    const es = i18nOf('es');
    expect(es.plural('pill.long', 1, { state: 'Sol', left: '1 h' })).toBe('Sol · queda 1 h');
    expect(es.plural('pill.long', 5, { state: 'Sol', left: '5 h' })).toBe('Sol · quedan 5 h');
    expect(i18nOf('de').plural('polar.sharedPlace', 2, { place: 'Nobile' })).toBe('Nobile · 2 Landeplätze');
  });
});

describe('site data in the visitor’s language', () => {
  const sites = JSON.parse(
    readFileSync(new URL('../../server/data/sites.json', import.meta.url), 'utf8'),
  ) as { status: string; statusDate: string }[];
  const free = [...new Set(sites.flatMap((s) => [s.status, s.statusDate]))]
    .filter((text) => !/^\d{4}-\d{2}-\d{2}$/.test(text) && text !== 'landed');

  it.each(LOCALES.filter((locale) => locale !== 'en'))('%s translates every status and date note the data holds', (locale) => {
    const i18n = i18nOf(locale);
    for (const text of free) expect(dataText(i18n, text), text).not.toBe(text);
  });

  it('keeps English words as the data wrote them, its dates in the visitor’s format, and unknown text as it is', () => {
    expect(dataText(EN, 'crashed 2025-06-05 (failed landing)')).toBe('crashed 5 Jun 2025 (failed landing)');
    expect(dataText(EN, 'NET Q1 2027 (launch)')).toBe('NET Q1 2027 (launch)');
    expect(dataText(i18nOf('es'), 'crashed 2025-06-05 (failed landing)')).toBe('se estrelló el 5 jun 2025 (aterrizaje fallido)');
    expect(dataText(i18nOf('de'), 'planned (launch slipped from 2026-08 to 2027)')).toBe('geplant (Start von Aug. 2026 auf 2027 verschoben)');
    expect(dataText(i18nOf('fr'), 'a status added later')).toBe('a status added later');
  });
});

/** English descriptive words of the site data; proper names never hold them. */
const ENGLISH_WORDS =
  /\b(region|planned|site|north|crater|area|connecting|ridge|Peak|near|target|candidate region|far side|crashed|crewed|landing|landed|originally|since|launch|announced|failed|before|slipped|list|NET|TBA)\b/;
const ISO_DATE = /\d{4}-\d{2}(-\d{2})?/;

describe('site and mission names in the visitor’s language (QA PR #17)', () => {
  const sites = JSON.parse(
    readFileSync(new URL('../../server/data/sites.json', import.meta.url), 'utf8'),
  ) as { name: string; mission: string; agency: string; status: string; statusDate: string; approximate: boolean; lat: number; lonEast: number; id: string; group: 'south_pole' }[];

  it.each(LOCALES.filter((locale) => locale !== 'en'))('%s leaves no English descriptive word nor ISO date in any name, mission or status', (locale) => {
    const i18n = i18nOf(locale);
    for (const site of sites) {
      const local = localSite(i18n, site);
      for (const text of [local.name, local.mission, missionLine(i18n, site), formatStatusDate(i18n, site.statusDate)]) {
        expect(text, `${locale}: ${site.id}`).not.toMatch(ENGLISH_WORDS);
        expect(text, `${locale}: ${site.id}`).not.toMatch(ISO_DATE);
      }
    }
  });

  it('keeps proper names and English names as the data wrote them', () => {
    for (const site of sites) expect(localSite(EN, site)).toEqual(site);
    const es = i18nOf('es');
    expect(localName(es, 'Malapert A region (IM-1 Odysseus)')).toBe('Región de Malapert A (IM-1 Odysseus)');
    expect(localName(es, 'Luna-25 planned site (north of Boguslawsky)')).toBe('Lugar previsto de Luna-25 (al norte de Boguslawsky)');
    expect(localName(i18nOf('de'), 'Von Kármán crater (Chang\'e-4, far side)')).toBe('Krater Von Kármán (Chang\'e-4, Mondrückseite)');
    expect(localName(es, 'Haworth (Artemis candidate region); Shioli crater (SLIM)')).toBe(
      'Haworth (región candidata de Artemis); Cráter Shioli (SLIM)',
    );
  });

  it('survives a name with thousands of «(detail)» groups', () => {
    const name = `A${' (b)'.repeat(5000)}`;
    expect(localName(i18nOf('es'), name)).toBe(name);
  });
});

describe('the pseudo-locale', () => {
  it('accents every word, makes it longer and leaves placeholders alone', () => {
    const text = pseudoText('{place} · {n} sites');
    expect(text).toMatch(/^\{place\} · \{n\} \S+$/);
    expect(text.replace(/\{\w+\}/g, '')).not.toMatch(/[a-z]{2}/);
    expect(pseudoText('Landing window').length).toBeGreaterThanOrEqual(Math.ceil('Landing window'.length * 1.3));
  });

  it('has the English keys and forms', () => {
    const pseudo = catalogueOf('en-XA');
    expect(Object.keys(pseudo)).toEqual(Object.keys(english));
    expect(Object.keys(pseudo['pill.long'])).toEqual(Object.keys(english['pill.long']));
  });
});
