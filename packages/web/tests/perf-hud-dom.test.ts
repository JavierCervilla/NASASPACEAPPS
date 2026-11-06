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

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Breadcrumbs } from '../src/devtools/breadcrumbs';
import { DevTools } from '../src/devtools/dev-tools';
import { PerfHud, type PerfHudOptions } from '../src/devtools/perf-hud';
import { installFakeDom, type FakeElement } from './fake-dom';

// One frame as long as the meter's window, so every sample is a reading.
const FULL_WINDOW = 0.5;

let body: FakeElement;
beforeEach(() => {
  body = installFakeDom();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

function hud(options: Partial<PerfHudOptions> = {}): PerfHud {
  return new PerfHud({
    tier: 'high',
    gpu: 'Test GPU',
    flags: { tier: null, capture: false },
    previous: [],
    current: () => [],
    ...options,
  });
}

function panel(): FakeElement {
  const [aside] = body.children;
  if (!aside) throw new Error('no panel on the page');
  return aside;
}

function readoutButton(): FakeElement {
  const button = panel().all().find((element) => element.tagName === 'BUTTON');
  if (!button) throw new Error('no readout button');
  return button;
}

/** The element a readout button attribute points at by id. */
function target(attribute: string): FakeElement {
  const id = readoutButton().getAttribute(attribute) ?? '';
  const element = panel().byId(id);
  if (!id || !element) throw new Error(`${attribute} points at nothing`);
  return element;
}

describe('perf hud on the page', () => {
  it('shows only the newest 6 lines of this session trail', () => {
    const trail = Array.from({ length: 10 }, (_, i) => `step-${i + 1}`);
    hud({ current: () => trail }).sample(FULL_WINDOW, null);
    const lines = (target('aria-describedby').textContent ?? '').split('\n');
    const live = lines.slice(lines.indexOf('This session:') + 1);
    expect(live).toEqual(trail.slice(-6));
  });

  it('reads the GPU block at each reading, so a session switch shows', () => {
    let ktx2 = 'ktx2 → ETC2';
    const view = hud({ gpuLines: () => ['tex ETC2 · max 4096 · aniso 1', ktx2] });
    view.sample(FULL_WINDOW, null);
    const text = () => target('aria-describedby').textContent ?? '';
    expect(text()).toContain('Test GPU\ntex ETC2 · max 4096 · aniso 1\nktx2 → ETC2');
    ktx2 = 'ktx2 off: worker failed';
    view.sample(FULL_WINDOW, null);
    expect(text()).toContain('\nktx2 off: worker failed\n');
  });

  it('keeps the newest 600 characters of the errors', () => {
    const view = hud();
    view.error('a'.repeat(700));
    view.error('the end');
    const errors = panel().all().find((element) => element.getAttribute('role') === 'status');
    expect(errors?.textContent).toHaveLength(600);
    expect(errors?.textContent?.endsWith('\nthe end')).toBe(true);
  });

  it('names the readout button briefly and describes it with the live numbers', () => {
    hud().sample(FULL_WINDOW, null);
    const button = readoutButton();
    expect(button.getAttribute('aria-label')).toBe('Performance readout');
    expect(target('aria-describedby').textContent).toMatch(/^2 fps · 500\.0 ms/);
  });

  it('says which region the readout button folds, and folds it', () => {
    hud().sample(FULL_WINDOW, null);
    const details = target('aria-controls');
    expect(details.hidden).toBe(false);
    readoutButton().click();
    expect(details.hidden).toBe(true);
    expect(readoutButton().getAttribute('aria-expanded')).toBe('false');
    expect(target('aria-describedby').textContent).toBe('2 fps · slowest 500 ms');
  });

  it('starts folded when asked, as on a phone', () => {
    hud({ folded: true }).sample(FULL_WINDOW, null);
    expect(target('aria-controls').hidden).toBe(true);
    expect(readoutButton().getAttribute('aria-expanded')).toBe('false');
    expect(target('aria-describedby').textContent).not.toContain('\n');
  });

  it('folded, keeps the errors under the fold and counts them on its one line (VENT-51)', () => {
    const view = hud({ folded: true });
    view.sample(FULL_WINDOW, null);
    view.error('WebGL context lost');
    view.error('TypeError: x is undefined');
    const errors = panel().all().find((element) => element.getAttribute('role') === 'status');
    expect(errors?.hidden).toBe(true);
    const alert = panel().all().find((element) => element.className === 'ventana-perf-hud__alert');
    expect(`${target('aria-describedby').textContent}${alert?.textContent}`).toBe('2 fps · slowest 500 ms · 2 errors');
    readoutButton().click();
    expect(errors?.hidden).toBe(false);
    expect(errors?.textContent).toBe('WebGL context lost\nTypeError: x is undefined');
    expect(alert?.textContent).toBe('');
  });

  it('starts open by default', () => {
    hud();
    expect(target('aria-controls').hidden).toBe(false);
    expect(readoutButton().getAttribute('aria-expanded')).toBe('true');
  });

  it('passes the folded start from the dev tools to the panel', () => {
    const crumbs = new Breadcrumbs({ storage: null, now: () => 0 });
    new DevTools({ tier: 'low', gpu: '', hash: '', crumbs, folded: true });
    expect(target('aria-controls').hidden).toBe(true);
  });
});
