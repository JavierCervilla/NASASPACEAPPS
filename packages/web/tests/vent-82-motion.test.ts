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

// VENT-82: the ten findings of the motion audit (improve-animations, standard effort). Each case holds one finding:
// rows light up instead of shrinking, per-frame writes reach only what they move, the hollow dot fills in one move,
// «New version ready» leaves as it came, reduced motion keeps its fades, the skeleton's shimmer is composited, the
// durations are tokens, the spring's comment says what the curve does, and the unused `.enter` is gone.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { I18nContext } from '../src/components/i18n-context';
import { placePush } from '../src/components/phone/use-push';
import { UpdateRow } from '../src/components/UpdateNotice';
import { detentsFor } from '../src/sheet/sheet-physics';
import { placeSheet, reveal } from '../src/sheet/sheet-view';
import { allRules, rulesOf, sheet, type CssRule } from './css-rules';
import { EN } from './i18n-factories';

const rules = allRules();
const inMotionQuery = (rule: CssRule): boolean => rule.at.some((at) => at.includes('prefers-reduced-motion'));
const reduced = (rule: CssRule): boolean => rule.at.some((at) => /prefers-reduced-motion:\s*reduce/.test(at));
const plain = (rule: CssRule): boolean => !inMotionQuery(rule) && !rule.at.some((at) => at.startsWith('@starting-style'));
const ruleFor = (selector: string, list: readonly CssRule[] = rules) => list.filter((rule) => rule.selectors.includes(selector));
const bodies = (list: readonly CssRule[]): string => list.map((rule) => rule.body).join('');
/** A duration written by hand (`0.3s`, `250ms`), not a token. */
const LITERAL_DURATION = /(?<![\w-])\d*\.?\d+m?s\b/;

/** An element's inline style as the code under test touches it, counting the writes. */
function fakeStyle() {
  const props = new Map<string, string>();
  const style = {
    transform: '',
    opacity: '',
    getPropertyValue: (name: string): string => props.get(name) ?? '',
    setProperty: vi.fn((name: string, value: string) => props.set(name, value)),
  };
  return style;
}

describe('#1: the site rows light up under the finger, as the other rows do', () => {
  it('.site-row lights up with the fill on :active', () => {
    expect(bodies(ruleFor('.site-row:active').filter(plain))).toMatch(/background-image:\s*linear-gradient\(var\(--fill\)/);
  });

  it('no rule shrinks a site row any more', () => {
    expect(bodies(ruleFor('.site-row:active'))).not.toMatch(/scale/);
  });
});

describe('#2: a frame of the sheet recalculates only what it fades', () => {
  const detents = detentsFor(800);
  const between = (detents.peek + detents.half) / 2;

  function sheetWithSummary() {
    const fit = { style: fakeStyle() };
    const style = fakeStyle();
    const el = { style, querySelector: vi.fn(() => fit) } as unknown as HTMLElement;
    return { el, style, fit };
  }

  it('writes the reveal on the summary, never on the sheet, whose whole content would inherit it', () => {
    const { el, style, fit } = sheetWithSummary();
    placeSheet(el, between, detents);
    expect(fit.style.getPropertyValue('--sheet-reveal')).toBe(String(reveal(detents, between)));
    expect(style.getPropertyValue('--sheet-reveal')).toBe('');
    expect(style.transform).toBe(`translate3d(0, ${between}px, 0)`);
  });

  it('writes the full detent and the reveal only when they change, while the transform follows every frame', () => {
    const { el, style, fit } = sheetWithSummary();
    placeSheet(el, detents.half, detents);
    placeSheet(el, detents.half - 40, detents);
    placeSheet(el, detents.full, detents);
    expect(style.setProperty).toHaveBeenCalledTimes(1);
    expect(fit.style.setProperty).toHaveBeenCalledTimes(1);
    expect(style.transform).toBe(`translate3d(0, ${detents.full}px, 0)`);
  });

  it('still places a sheet whose body holds no summary (the picker, the calendar)', () => {
    const style = fakeStyle();
    const el = { style, querySelector: () => null } as unknown as HTMLElement;
    placeSheet(el, detents.full, detents);
    expect(style.getPropertyValue('--sheet-full-top')).toBe(`${detents.full}px`);
  });

  it('the reveal does not reach past the summary\'s children: registered non-inheriting, inherited by them alone', () => {
    const css = sheet('phone.css');
    expect(css).toMatch(/@property --sheet-reveal\s*\{[^}]*inherits:\s*false;[^}]*initial-value:\s*1;/);
    const fade = bodies(ruleFor('.summary > :not(.summary__head)'));
    expect(fade).toMatch(/--sheet-reveal:\s*inherit/);
    expect(fade).toMatch(/opacity:\s*var\(--sheet-reveal\)/);
  });
});

describe('#3: the hollow dot fills in one move', () => {
  it('the ring (box-shadow) fades with the fill, on the same duration and curve', () => {
    const dot = bodies(ruleFor('.signal-dot').filter((rule) => !reduced(rule)));
    expect(dot).toMatch(/background-color var\(--dur-enter\) var\(--ease-out\)/);
    expect(dot).toMatch(/box-shadow var\(--dur-enter\) var\(--ease-out\)/);
  });
});

describe('#4: «New version ready» leaves the way it came, as «Offline» does', () => {
  const row = (shown: boolean) =>
    renderToStaticMarkup(
      createElement(I18nContext, { value: EN }, createElement(UpdateRow, { shown, onUpdate: vi.fn(), onDismiss: vi.fn() })),
    );

  it('carries data-presence, so presence.css moves it in and out', () => {
    expect(row(true)).toMatch(/data-presence="in"/);
    expect(row(false)).toMatch(/data-presence="out"/);
  });

  it('update.css no longer runs a motion of its own: presence.css is the one way in and out', () => {
    const own = rulesOf(sheet('update.css')).filter((rule) =>
      rule.selectors.some((s) => s.startsWith('.update-notice[data-shown]')) && /transition/.test(rule.body));
    expect(own).toEqual([]);
  });
});

describe('#5: reduced motion keeps its fades', () => {
  it('the globe splash fades over --dur-fade instead of vanishing', () => {
    const splash = bodies(ruleFor('.globe-splash').filter(reduced));
    expect(splash).toMatch(/opacity var\(--dur-fade\) linear/);
    expect(splash).toMatch(/visibility 0s linear var\(--dur-fade\)/);
    expect(splash).not.toMatch(/transition:\s*none/);
  });

  it('the layer switch drops only its knob\'s slide: a colour change is no motion', () => {
    const switches = ruleFor('.layer-switch::before', rulesOf(sheet('saved.css'))).filter(reduced);
    expect(bodies(switches)).toMatch(/transition:\s*background-color var\(--dur-fade\)/);
    expect(bodies(switches)).not.toMatch(/transform|none/);
    expect(ruleFor('.layer-switch', rulesOf(sheet('saved.css'))).filter(reduced)).toEqual([]);
  });
});

describe('#6: a frame of the push moves the two pages, not the list\'s styles', () => {
  function stack() {
    const root = { style: fakeStyle() };
    const page = { style: fakeStyle() };
    const style = fakeStyle();
    const pick = (selector: string) => (selector.includes('push__root') ? root : page);
    const node = { style, querySelector: vi.fn(pick) } as unknown as HTMLElement;
    return { node, style, root, page };
  }

  it('slides the list a third of the way out and the page in, as transforms on each', () => {
    const { node, style, root, page } = stack();
    placePush(node, 0.5, false);
    expect(root.style.transform).toBe('translateX(-15%)');
    expect(page.style.transform).toBe('translateX(52.5%)');
    expect(style.setProperty).not.toHaveBeenCalled();
  });

  it('cross-fades in place under reduced motion', () => {
    const { node, root, page } = stack();
    placePush(node, 0.25, true);
    expect(root.style.opacity).toBe('0.75');
    expect(page.style.opacity).toBe('0.25');
    expect(root.style.transform).toBe('');
  });

  it('lang.css derives nothing from a --push any more', () => {
    expect(sheet('lang.css')).not.toMatch(/var\(--push\)/);
  });
});

describe('#7: the skeleton shimmers with a transform, not a repaint', () => {
  it('no animation moves a background-position', () => {
    expect(sheet('phone.css')).not.toMatch(/background-position/);
  });

  it('the shine is a ::after that translates across, 1.4 s linear', () => {
    const shine = bodies(ruleFor('.widget-skeleton::after'));
    expect(shine).toMatch(/animation:\s*skeleton 1\.4s linear infinite/);
    expect(sheet('phone.css')).toMatch(/@keyframes skeleton\s*\{\s*from\s*\{\s*transform:\s*translateX\(-100%\)/);
    expect(sheet('phone.css')).toMatch(/to\s*\{\s*transform:\s*translateX\(100%\)/);
  });
});

describe('#8: durations are tokens, and every button answers the press the same way', () => {
  it.each([
    ['update.css', '.update-notice[data-shown]'],
    ['on-foot.css', '.on-foot__retry'],
    ['saved.css', '.layer-switch'],
    ['saved.css', '.layer-switch::before'],
    ['orientation.css', '.compass'],
  ])('%s %s writes no duration by hand', (file, selector) => {
    const transitions = ruleFor(selector, rulesOf(sheet(file))).map((rule) => /transition:([^;]*)/.exec(rule.body)?.[1] ?? '');
    for (const transition of transitions) expect(transition).not.toMatch(LITERAL_DURATION);
  });

  it('the compass shrinks to 0.97, on the press only, as the other buttons do', () => {
    expect(bodies(ruleFor('.compass:active'))).toMatch(/scale:\s*0\.97/);
    expect(bodies(ruleFor('.compass:active'))).toMatch(/transition:\s*scale var\(--dur-press\) ease-out/);
    const base = ruleFor('.compass').map((rule) => /transition:([^;]*)/.exec(rule.body)?.[1] ?? '');
    for (const transition of base) expect(transition).not.toMatch(/\bscale\b/);
  });

  it('the 3D view\'s buttons shrink on the press only, over --dur-press', () => {
    const pressed = bodies(ruleFor('.on-foot__retry:active'));
    expect(pressed).toMatch(/transition:\s*transform var\(--dur-press\) ease-out/);
    expect(bodies(ruleFor('.on-foot__retry').filter(plain))).not.toMatch(/transform/);
  });
});

describe('#9: the spring\'s comment says what its curve does', () => {
  const samples = (/--spring:\s*linear\(([^)]*)\)/.exec(sheet('tokens.css'))?.[1] ?? '').split(',').map(Number);

  it('the samples are a critically damped step, 1 - (1 + u) e^-u, with u = 9.43 at the end', () => {
    samples.forEach((value, k) => {
      const u = (9.43 * k) / (samples.length - 1);
      expect(value).toBeCloseTo(1 - (1 + u) * Math.exp(-u), 2);
    });
  });

  it('so the response is 2π / 9.43 = 0.666 of the duration, which the comment says', () => {
    expect((2 * Math.PI) / 9.43).toBeCloseTo(0.666, 3);
    expect(sheet('tokens.css')).toMatch(/0\.666 of the duration/);
    expect(sheet('tokens.css')).not.toMatch(/response 0\.4 s\)/);
  });
});

describe('#10: no unused entry animation', () => {
  it('global.css holds no .enter rule or enter keyframes', () => {
    expect(rules.filter((rule) => rule.selectors.some((s) => /(^|\s)\.enter\b/.test(s)))).toEqual([]);
    expect(sheet('global.css')).not.toMatch(/@keyframes enter\b/);
  });
});
