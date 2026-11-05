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

/** The benchmark's results (VENT-81): the table's medians and changes, how they are written, and the copied report. */
import { describe, expect, it } from 'vitest';
import { browserName, cellText, changeText } from '../src/bench/display';
import { reportText } from '../src/bench/report';
import { resultRows } from '../src/bench/results';
import { EN, i18nOf } from './i18n-factories';
import { doneState, run } from './bench-factories';

const RESULTS = [
  run('A', 1, 30), run('A', 2, 40), run('A', 3, 50),
  run('B', 1, 40, { contexts: 1 }), run('B', 2, 50, { contexts: 1 }), run('B', 3, 60, { contexts: 1, lost: 1 }),
];

describe('resultRows', () => {
  const rows = resultRows(RESULTS);
  const row = (id: string) => rows.find((r) => r.id === id);

  it('has the canvas\'s eight rows in its order', () => {
    expect(rows.map((r) => r.id)).toEqual(['fps', 'p95', 'worst', 'longTasks', 'contexts', 'globeMap', 'heap', 'lost']);
    expect(rows.filter((r) => r.strong).map((r) => r.id)).toEqual(['fps', 'p95', 'contexts', 'globeMap', 'lost']);
  });

  it('takes the median over each variant\'s runs of the turning step, and B\'s change against A', () => {
    expect(row('fps')).toMatchObject({ a: 40, b: 50, change: { kind: 'percent', value: 25 } });
    expect(row('contexts')).toMatchObject({ a: 2, b: 1, change: { kind: 'diff', value: -1 } });
    expect(row('globeMap')).toMatchObject({ a: 40, b: 50 });
    expect(row('longTasks')).toMatchObject({ a: 0.4, b: 0.5 });
  });

  it('says a context was lost when any step of a run lost one, with no change', () => {
    expect(row('lost')).toMatchObject({ a: 0, b: 1, change: null });
  });
});

describe('the table\'s text', () => {
  it('writes each metric in its unit, through the page\'s numbers', () => {
    expect(cellText('fps', 41.26, EN)).toBe('41.3 fps');
    expect(cellText('p95', 24.4, EN)).toBe('24 ms');
    expect(cellText('longTasks', 1.25, EN)).toBe('1.3 s');
    expect(cellText('contexts', 2, EN)).toBe('2');
    expect(cellText('contexts', 1.5, EN)).toBe('1.5');
    expect(cellText('heap', null, EN)).toBe('n/a');
    expect(cellText('lost', 0, EN)).toBe('no');
    expect(cellText('fps', 41.26, i18nOf('es'))).toBe('41,3 fps');
  });

  it('signs the change with a true minus', () => {
    expect(changeText({ kind: 'percent', value: 12.4 }, EN)).toBe('+12 %');
    expect(changeText({ kind: 'percent', value: -8.6 }, EN)).toBe('−9 %');
    expect(changeText({ kind: 'diff', value: -1 }, EN)).toBe('−1');
    expect(changeText({ kind: 'diff', value: 0 }, EN)).toBe('0');
    expect(changeText(null, EN)).toBe('');
  });

  it('names the browser shortly', () => {
    expect(browserName('Mozilla/5.0 (Linux; Android 16) AppleWebKit/537.36 Chrome/142.0.0.0 Mobile Safari/537.36')).toBe('Chrome 142');
    expect(browserName('Mozilla/5.0 (X11; Linux) Gecko/20100101 Firefox/133.0')).toBe('Firefox 133');
    expect(browserName('Mozilla/5.0 (iPhone) AppleWebKit/605.1.15 Version/18.2 Mobile/15E148 Safari/604.1')).toBe('Safari 18');
  });
});

describe('reportText', () => {
  const text = reportText(doneState([run('A', 1, 30), run('B', 1, 40, { contexts: 1 })]));

  it('opens with the header: script, instant, GPU, browser, viewport, screen, build, each run\'s tier and the runs', () => {
    expect(text).toContain('Script v1 · instant 1967-03-19T12:00:00Z');
    expect(text).toContain('GPU: PowerVR D-Series DXT-48-1536');
    expect(text).toContain('Browser: Mozilla/5.0');
    expect(text).toContain('Viewport: 412 × 839 @ 2.625');
    expect(text).toContain('Screen: 412 × 915');
    expect(text).toContain('View tier per run: A1 medium · B1 medium');
    expect(text).toContain('Build: ab12cd34ef56');
    expect(text).toContain('Runs: 1 per variant, order A B');
  });

  it('has the medians of every step and metric for both variants', () => {
    expect(text).toContain('turn contexts: A 2 · B 1');
    expect(text).toContain('globeIdle fps: A 30 · B 40');
    expect(text).toContain('backToGlobe heapBytes: A 41943040 · B 41943040');
  });

  it('has every step of every run', () => {
    expect(text).toMatch(/^A1 openView: ms=3000 fps=30 /m);
    expect(text).toMatch(/^B1 changePoint: .* contexts=1 /m);
    expect(text.match(/^[AB]1 /gm)).toHaveLength(12);
  });
});
