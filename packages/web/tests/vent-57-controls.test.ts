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
 * One material and one set of controls (VENT-57 part A, variants the human chose on the VENT-56 canvas): what floats
 * over the Moon wears the first pin hint's frosted recipe (C-02), every segmented control is one control (C-16),
 * every secondary button is one grey pill (C-17), «Saved» keeps «Save»'s pill (V-01), and Play is a grey circle like
 * the month arrows (V-07).
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { LENS_SURFACES } from '../src/glass/lens-set';
import { allRules, declared, rootToken, rulesOf, sheet } from './css-rules';

const RULES = allRules();
const PHONE = 'max-width: 767.98px';
const LIGHT = 'prefers-color-scheme: light';

/** The rules outside any at-rule whose selector list holds `selector`, from `file` or any sheet. */
const plainRules = (selector: string, file?: string) =>
  RULES.filter((r) => r.at.length === 0 && r.selectors.includes(selector) && (!file || r.file === file));

/** The value `property` takes on `selector` outside at-rules: the last rule's, as in the cascade within a sheet. */
const valueOn = (selector: string, property: string, file?: string) =>
  plainRules(selector, file).map((r) => declared(r.body, property)).filter(Boolean).at(-1);

describe('C-02: one frosted material for what floats over the Moon', () => {
  it('is the hint\'s recipe as tokens: the surface fill, a 20 px blur and a 1 px inner rim', () => {
    expect(rootToken('--float-fill', [])).toBe('var(--surface)');
    expect(rootToken('--float-blur', [])).toBe('blur(20px)');
    expect(rootToken('--float-rim', [])).toBe('inset 0 0 0 1px var(--surface-edge)');
  });

  it('takes the phone bar\'s fill and edge on phones, as the hint did', () => {
    expect(rootToken('--float-fill', [PHONE])).toBe('var(--phone-tabs)');
    expect(rootToken('--float-rim', [PHONE])).toBe('var(--phone-bar-edge)');
  });

  it.each([
    ['.compass', 'orientation.css'],
    ['.pin-readout', 'pin.css'],
    ['.pin-hint', 'pin.css'],
    ['.globe-layers', 'globe.css'],
    // Part B's rows (offline, undo, Save-Data) and the update row they copy: one material with the hint.
    ['.update-notice[data-shown]', 'update.css'],
    ['.offline-notice[data-shown]', 'update.css'],
    ['.undo-toast', 'update.css'],
    ['.globe-load', 'update.css'],
  ])('%s wears it', (selector, file) => {
    expect(valueOn(selector, 'background', file)).toBe('var(--float-fill)');
    expect(valueOn(selector, 'backdrop-filter', file)).toBe('var(--float-blur)');
    expect(valueOn(selector, 'box-shadow', file)).toBe('var(--float-rim)');
  });

  it('no phone rule paints the hint or the compass another fill', () => {
    const phone = RULES.filter((r) => r.at.some((m) => m.includes('max-width: 767')));
    for (const selector of ['.pin-hint', '.compass', '.pin-readout']) {
      const own = phone.filter((r) => r.selectors.includes(selector));
      expect(own.map((r) => declared(r.body, 'background')).filter(Boolean), selector).toEqual([]);
    }
  });

  it('the Layers key leaves the Liquid glass: no Liquid rule and no lens names it', () => {
    const liquid = rulesOf(sheet('glass.css')).filter((r) => r.selector.includes('.globe-layers'));
    expect(liquid).toEqual([]);
    expect(LENS_SURFACES.split(', ')).not.toContain('.globe-layers');
  });
});

/** The segmented controls: the header's view tabs, the site picker's regions and the data source switch. */
const TRACKS = ['.views', '.segmented'];
const SEGMENTS = ['.views > *', '.segmented button'];
const MARKS = ['.views [aria-current=\'page\']', '.segmented button[aria-pressed=\'true\']',
  '.segmented [role=\'radio\'][aria-checked=\'true\']'];
const PAGE = readFileSync(new URL('../src/components/Page.astro', import.meta.url), 'utf8');

/** One rule of controls.css holds every selector of `list`. */
const oneRule = (list: readonly string[]) => {
  const found = rulesOf(sheet('controls.css')).filter((r) => r.at.length === 0 && list.every((s) => r.selectors.includes(s)));
  expect(found, list.join(', ')).toHaveLength(1);
  return found[0]!.body;
};

describe('C-16: one segmented control', () => {
  it('a grey track, 2 px around the mark, radius 12', () => {
    const track = oneRule(TRACKS);
    expect(declared(track, 'background')).toBe('var(--fill)');
    expect(declared(track, 'padding')).toBe('2px');
    expect(declared(track, 'border-radius')).toBe('12px');
  });

  it('segments 40 px tall (44 with the track), radius 10, in the text colour', () => {
    const segment = oneRule(SEGMENTS);
    expect(declared(segment, 'min-height')).toBe('40px');
    expect(declared(segment, 'border-radius')).toBe('10px');
    expect(declared(segment, 'color')).toBe('var(--text)');
    expect(declared(segment, 'font-weight')).toBe('600');
  });

  it('a segment off the mark is transparent on the track, never the browser\'s button face', () => {
    expect(declared(oneRule(SEGMENTS), 'background')).toBe('transparent');
  });

  it('the mark: #636366 with no shadow, under a light system too (VENT-113)', () => {
    const mark = oneRule(MARKS);
    expect(declared(mark, 'background')).toBe('var(--segment-on)');
    expect(declared(mark, 'box-shadow')).toBe('var(--segment-shadow)');
    expect(rootToken('--segment-on', [])).toBe('#636366');
    expect(rootToken('--segment-shadow', [])).toBe('none');
    expect(rootToken('--segment-on', [LIGHT])).toBe('#636366');
    expect(rootToken('--segment-shadow', [LIGHT])).toBe('none');
  });

  it('no other sheet paints a track, a segment or a mark its own way', () => {
    for (const selector of [...TRACKS, ...SEGMENTS, ...MARKS]) {
      const elsewhere = RULES.filter((r) => r.file !== 'controls.css' && r.selectors.includes(selector));
      for (const property of ['background', 'border-radius', 'color', 'box-shadow', 'min-height']) {
        expect(elsewhere.map((r) => declared(r.body, property)).filter(Boolean), `${selector} ${property}`).toEqual([]);
      }
    }
  });

  it('the header\'s scoped styles leave the look to the shared control', () => {
    const style = /<style>([\s\S]*)<\/style>/.exec(PAGE)?.[1] ?? '';
    for (const rule of rulesOf(style).filter((r) => r.selectors.some((s) => s.startsWith('.views')))) {
      const look = ['background', 'border-radius', 'color', 'box-shadow', 'min-height'];
      for (const property of rule.selector === '.views' ? [...look, 'padding'] : look) {
        expect(declared(rule.body, property), `${rule.selector} ${property}`).toBeUndefined();
      }
    }
  });
});

/** Every secondary button (the d08 board), «Undo» left to the toast's row. */
const SECONDARY = ['.card-retry', '.strip-status button', '.widgets-error button', '.source-note__retry',
  '.on-foot__retry', '.now-button'];

describe('C-17: one secondary button', () => {
  it('a grey pill fully rounded, 44 px tall, weight 600, no underline', () => {
    const button = oneRule(SECONDARY);
    expect(declared(button, 'min-height')).toBe('44px');
    expect(declared(button, 'border-radius')).toBe('999px');
    expect(declared(button, 'background')).toBe('var(--fill)');
    expect(declared(button, 'color')).toBe('var(--text)');
    expect(declared(button, 'font-weight')).toBe('600');
    expect(declared(button, 'text-decoration')).toBe('none');
    expect(declared(button, 'border')).toBe('0');
  });

  it('disabled, its text dims', () => {
    expect(declared(oneRule(SECONDARY.map((s) => `${s}:disabled`)), 'color')).toBe('var(--text-muted)');
  });

  it('no other rule restyles one, but the dark 3D view\'s', () => {
    for (const selector of SECONDARY) {
      const elsewhere = RULES.filter((r) => r.file !== 'controls.css' && r.at.length === 0
        && r.selectors.some((s) => s === selector || s.endsWith(` ${selector}`)));
      for (const property of ['background', 'border-radius', 'text-decoration', 'min-height', 'font-weight']) {
        const set = elsewhere.filter((r) => declared(r.body, property) !== undefined);
        const allowed = set.every((r) => r.selector === '.on-foot .on-foot__retry' && property === 'background');
        expect(allowed, `${selector} ${property}: ${set.map((r) => r.selector).join(' | ')}`).toBe(true);
      }
    }
  });

  it('on the 3D view, dark in both themes, it takes the dark theme\'s fill and the view\'s ink', () => {
    const [own] = rulesOf(sheet('on-foot.css')).filter((r) => r.selector === '.on-foot .on-foot__retry' && r.at.length === 0);
    expect(declared(own?.body ?? '', 'background')).toBe(rootToken('--fill', []));
    expect(declared(own?.body ?? '', 'color')).toBe('var(--on-foot-ink)');
  });

  it('«Undo» is not one of them: the toast\'s row owns it', () => {
    expect(rulesOf(sheet('controls.css')).some((r) => r.selector.includes('undo'))).toBe(false);
  });
});

describe('V-01: «Saved» keeps «Save»\'s grey pill', () => {
  it('no fill or ink of its own once saved', () => {
    const saved = RULES.filter((r) => r.selectors.includes('.save-button[data-saved=\'true\']'));
    for (const property of ['background', 'color']) {
      expect(saved.map((r) => declared(r.body, property)).filter(Boolean), property).toEqual([]);
    }
    expect(valueOn('.save-button', 'background', 'saved.css')).toBe('var(--fill)');
  });
});

describe('V-07: Play is a grey circle like the month arrows', () => {
  it('the arrows\' fill and the text colour', () => {
    expect(valueOn('.play-button', 'background', 'calendar.css')).toBe(valueOn('.round-button', 'background', 'calendar.css'));
    expect(valueOn('.play-button', 'color', 'calendar.css')).toBe('var(--text)');
  });

  it('in the phone\'s Calendar sheet, the arrows\' field fill', () => {
    const [field] = plainRules('.calendar .round-button', 'calendar.css');
    expect(field?.selectors).toContain('.calendar .play-button');
    expect(declared(field?.body ?? '', 'background')).toBe('var(--phone-field)');
  });
});
