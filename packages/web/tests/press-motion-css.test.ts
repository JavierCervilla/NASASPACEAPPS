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

// Press feedback and motion read from the stylesheets (VENT-55, apple-design §1, §7, §12, §14): every control answers
// the press, the same way with or without reduced motion; surfaces leave along the path they came in; the critically
// damped spring is a token; moving lines and the compass move with transforms, not layout.
import { describe, expect, it } from 'vitest';
import { EXIT_MS } from '../src/components/presence';
import { allRules, rulesOf, sheet, type CssRule } from './css-rules';

const rules = allRules();

const inMotionQuery = (rule: CssRule): boolean => rule.at.some((at) => at.includes('prefers-reduced-motion'));
const reduced = (rule: CssRule): boolean => rule.at.some((at) => /prefers-reduced-motion:\s*reduce/.test(at));
const plain = (rule: CssRule): boolean => !inMotionQuery(rule) && !rule.at.some((at) => at.startsWith('@starting-style'));

/** The rules whose selector list holds `selector` exactly. */
const ruleFor = (selector: string, list = rules) => list.filter((rule) => rule.selectors.includes(selector));

/** Buttons shrink a little, as `.card-retry`, `.tab` and the others do. */
const BUTTONS = [
  '.widgets-error button',
  '.strip-status button',
  '.source-note__retry',
  '.undo-toast__undo',
  '.lang-page__back',
  '.pin-hint__close',
  '.picker__gear',
  '.quickmap-link',
  '.quickmap-pill',
];

/** Rows and segments light up under the finger, as in iOS. */
const ROWS = [
  '.views > *',
  '.segmented button',
  '.site-row',
  '.row-menu__item',
  '.saved-row__more',
  '.lang-row',
  '.lang-option',
  '.layer-row__label',
];

/** The dots on the Moon shrink, as `.polar-marker` does. */
const MARKS = ['.globe-marker:active::after', '.globe-point:active::before', '.polar-saved:active::before'];

describe('C-03: every control answers the press', () => {
  it.each(BUTTONS)('%s shrinks to 0.97 on :active, over --dur-press', (selector) => {
    const pressed = ruleFor(`${selector}:active`).filter(plain);
    expect(pressed.map((rule) => rule.body).join('')).toMatch(/scale\(0\.97\)/);
    expect(pressed.map((rule) => rule.body).join('')).toMatch(/var\(--dur-press\)/);
  });

  it.each(ROWS)('%s lights up with the fill on :active', (selector) => {
    const pressed = ruleFor(`${selector}:active`).filter(plain);
    expect(pressed.map((rule) => rule.body).join('')).toMatch(/background-image:\s*linear-gradient\(var\(--fill\)/);
  });

  it.each(MARKS)('%s shrinks its dot', (selector) => {
    expect(ruleFor(selector).filter(plain).map((rule) => rule.body).join('')).toMatch(/scale\(0\.9\)/);
  });
});

describe('C-03: the QuickMap controls press where every other control does (VENT-127)', () => {
  it.each(['.quickmap-link', '.quickmap-pill'])('%s:active lives in press.css', (selector) => {
    expect(ruleFor(`${selector}:active`).map((rule) => rule.file)).toEqual(['press.css']);
  });
});

describe('C-04: reduced motion keeps the same press response', () => {
  it('no :active rule sits inside a prefers-reduced-motion query, on any stylesheet', () => {
    const split = rules.filter((rule) => rule.selectors.some((s) => s.includes(':active')) && inMotionQuery(rule));
    expect(split.map((rule) => `${rule.file}: ${rule.selectors.join(', ')}`)).toEqual([]);
  });
});

const POPOVERS = ['.site-popover', '.lang-popover', '.row-menu'];
const presence = rulesOf(sheet('presence.css'));

describe('C-13: surfaces leave along the path they came in, as a material', () => {
  it('no popover enters with a one-way keyframe animation any more', () => {
    expect(sheet('calendar.css')).not.toMatch(/popover-in/);
    expect(rules.filter((rule) => /animation:\s*(popover|toast)-in/.test(rule.body))).toEqual([]);
  });

  it.each(POPOVERS)('%s fades, scales and blurs both ways, kept on the top layer while it leaves', (popover) => {
    const base = presence.filter(plain).filter((rule) => rule.selectors.includes(popover));
    const body = base.map((rule) => rule.body).join('');
    expect(body).toMatch(/overlay[^,;]*allow-discrete/);
    expect(body).toMatch(/display[^,;]*allow-discrete/);
    expect(body).toMatch(/filter:\s*blur\(/);
    expect(body).toMatch(/scale:\s*0\.96/);
    const open = presence.filter((rule) => rule.selectors.includes(`${popover}:popover-open`));
    expect(open.some((rule) => rule.at.includes('@starting-style'))).toBe(true);
  });

  it('the pin hint and the offline notice materialise in and out through data-presence', () => {
    const out = presence.filter((rule) => rule.selectors.includes("[data-presence='out']") && plain(rule));
    expect(out.map((rule) => rule.body).join('')).toMatch(/filter:\s*blur\(/);
    const starting = presence.filter((rule) => rule.at.includes('@starting-style'));
    expect(starting.some((rule) => rule.selectors.includes("[data-presence='in']"))).toBe(true);
  });

  it('the undo toast goes back down the way it came, its visibility held to the end', () => {
    const toast = ruleFor('.undo-toast').filter(plain).map((rule) => rule.body).join('');
    expect(toast).toMatch(/transition:[^;]*visibility/);
    const closed = ruleFor(".undo-toast[data-open='false']").filter(plain).map((rule) => rule.body).join('');
    expect(closed).toMatch(/translate:\s*0 12px/);
    expect(closed).toMatch(/opacity:\s*0/);
    expect(closed).toMatch(/pointer-events:\s*none/);
  });

  it('under reduced motion every surface only fades', () => {
    const fades = [...presence, ...rulesOf(sheet('saved.css'))].filter(reduced);
    const surfaces = fades.filter((rule) => rule.selectors.some((s) => /popover|row-menu|presence|undo-toast/.test(s)));
    expect(surfaces.length).toBeGreaterThan(0);
    for (const rule of surfaces) {
      const transition = /transition:([^;]*)/.exec(rule.body)?.[1] ?? '';
      expect(transition).not.toMatch(/scale|translate|filter|transform/);
      expect(rule.body).not.toMatch(/scale:\s*0\.|translate:\s*0 \d|blur\(/);
    }
  });

  it('the exit the components wait for is the stylesheet\'s --dur-enter', () => {
    expect(sheet('tokens.css')).toMatch(new RegExp(`--dur-enter:\\s*${EXIT_MS}ms`));
  });
});

describe('C-23: the critically damped spring is a token', () => {
  it('tokens.css holds --spring as a linear() curve and no other sheet redefines it', () => {
    expect(sheet('tokens.css')).toMatch(/--spring:\s*linear\(0,/);
    const others = rules.filter((rule) => rule.file !== 'tokens.css' && /--spring:/.test(rule.body));
    expect(others.map((rule) => rule.file)).toEqual([]);
  });

  it('popovers and notices move on it («New version ready» through presence.css since VENT-82)', () => {
    expect(presence.map((rule) => rule.body).join('')).toMatch(/var\(--spring\)/);
    expect(ruleFor('.undo-toast').map((rule) => rule.body).join('')).toMatch(/var\(--spring\)/);
  });
});

describe('C-19: what moves, moves with transforms', () => {
  it('the compass slides with translate, not top', () => {
    const compass = ruleFor('.compass').map((rule) => rule.body).join('');
    expect(compass).not.toMatch(/transition:[^;]*\btop\b/);
    expect(compass).toMatch(/transition:[^;]*\btranslate\b/);
  });

  it.each(['.rail--x', '.rail--y'])('%s spans its track, so a percentage translate is the track\'s', (rail) => {
    expect(ruleFor(rail).map((rule) => rule.body).join('')).toMatch(/pointer-events:\s*none/);
  });
});
