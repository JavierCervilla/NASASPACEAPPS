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

// VENT-105: the `?debug` readout states the conditions of what it shows, so a screenshot of it explains itself.
import { describe, expect, it } from 'vitest';
import { Breadcrumbs } from '../src/devtools/breadcrumbs';
import { instantLine, lossLine, sceneLine } from '../src/devtools/condition-lines';
import { Conditions } from '../src/devtools/conditions';
import { watchContext } from '../src/devtools/context-watch';
import { switchLine } from '../src/devtools/switch-line';
import { readSceneMarks, shadowMapState, writeSceneMarks, type SceneMarks } from '../src/terrain/scene-marks';
import { headerGpu } from '../src/bench/environment';

const IM2 = { lat: -84.79, lonEast: 29.2 };
/** Sun +6.7° at IM-2 (tests/e2e/vent-100-lunar-night.spec.ts). */
const DAY_MS = Date.parse('2026-11-22T00:00:00Z');
/** Sun −3.7° at IM-2. */
const NIGHT_MS = Date.parse('2026-11-06T15:04:00Z');

describe('switch line', () => {
  it('says none when the address has no diagnostic switch', () => {
    expect(switchLine('')).toBe('switches: none');
    expect(switchLine('?debug&site=im2-athena&lat=-85&lon=40')).toBe('switches: none');
  });

  it('names every known switch in a fixed order', () => {
    const search = '?bench=depth&glass=frosted&quality=low&onfoot=far,shadows&ktx2=0&shadows=force&depth=linear&debug';
    expect(switchLine(search)).toBe(
      'switches: depth=linear shadows=force ktx2=0 onfoot=shadows,far quality=low glass=frosted bench=depth');
  });

  it('never echoes words it does not know', () => {
    const search = '?depth=<b>x</b>&shadows=maybe&ktx2=1&onfoot=evil,far&quality=ultra&glass=wet&bench=<i>';
    expect(switchLine(search)).toBe('switches: onfoot=far bench');
  });

  it('reads a bare ?bench as the A/B suite', () => {
    expect(switchLine('?bench')).toBe('switches: bench');
  });
});

const MARKS: SceneMarks = { depth: 'linear', bits: 24, reversed: false, shadows: 'forced', tier: 'high' };

describe('scene marks', () => {
  it('says why the shadow map is off, or that it was forced', () => {
    expect(shadowMapState({ leftOut: true, forced: true, unsafe: true })).toBe('left-out');
    expect(shadowMapState({ leftOut: false, forced: true, unsafe: true })).toBe('forced');
    expect(shadowMapState({ leftOut: false, forced: false, unsafe: true })).toBe('unsafe-gpu');
    expect(shadowMapState({ leftOut: false, forced: false, unsafe: false })).toBe('on');
  });

  it('reads back what the scene wrote on its canvas, and nothing from a canvas without marks', () => {
    const canvas = { dataset: {} as Record<string, string | undefined> };
    expect(readSceneMarks(canvas)).toBeNull();
    writeSceneMarks(canvas, MARKS);
    expect(readSceneMarks(canvas)).toEqual(MARKS);
  });
});

describe('scene line', () => {
  it('names the depth buffer, its bits, the reversed buffer, the shadow map and the tier', () => {
    expect(sceneLine(MARKS)).toBe('on-foot: depth linear · 24 bits · reversed off · shadow map on (forced) · tier high');
  });

  it('says why the shadow map is off', () => {
    expect(sceneLine({ ...MARKS, shadows: 'unsafe-gpu', depth: 'reversed', reversed: true }))
      .toBe('on-foot: depth reversed · 24 bits · reversed on · shadow map off (unsafe GPU) · tier high');
    expect(sceneLine({ ...MARKS, shadows: 'left-out' })).toContain('shadow map off (?onfoot=shadows)');
    expect(sceneLine({ ...MARKS, shadows: 'on' })).toContain('shadow map on ·');
  });
});

describe('instant line', () => {
  it('says live or set, the UTC minute, the Sun and day or night', () => {
    const at = Date.parse('2026-11-30T20:00:59Z');
    expect(instantLine({ atMs: at, live: true, sun: { elDeg: 6.71, night: false, terrain: true } }))
      .toBe('instant live · 2026-11-30 20:00 UTC · Sun +6.7° · day (terrain)');
    expect(instantLine({ atMs: at, live: false, sun: { elDeg: -3.66, night: true, terrain: false } }))
      .toBe('instant set · 2026-11-30 20:00 UTC · Sun −3.7° · night (level)');
  });

  it('says only the instant when no point is selected', () => {
    expect(instantLine({ atMs: DAY_MS, live: false, sun: null })).toBe('instant set · 2026-11-22 00:00 UTC');
  });
});

describe('loss line', () => {
  it('names the canvas and the second', () => {
    expect(lossLine({ kind: 'onFoot', seconds: 115.24 })).toBe('WebGL context lost: on-foot at 115.2 s');
    expect(lossLine({ kind: 'globe', seconds: 3 })).toBe('WebGL context lost: globe at 3.0 s');
  });
});

describe('conditions', () => {
  const clockAt = (ms: number) => ({ get: () => ({ atMs: ms, live: true }) });

  it('reads the switches, the instant at the selected point and the losses', () => {
    const conditions = new Conditions(() => '?depth=log');
    conditions.watchInstant({ time: clockAt(DAY_MS), place: () => ({ ...IM2, profile: null }) });
    conditions.lost('globe', 12.3);
    expect(conditions.lines()).toEqual([
      'switches: depth=log',
      expect.stringMatching(/^instant live · 2026-11-22 00:00 UTC · Sun \+6\.\d° · day \(level\)$/),
      'WebGL context lost: globe at 12.3 s',
    ]);
  });

  it('says night when the Sun is under the level', () => {
    const conditions = new Conditions(() => '');
    conditions.watchInstant({ time: clockAt(NIGHT_MS), place: () => ({ ...IM2, profile: null }) });
    expect(conditions.lines()[1]).toMatch(/Sun −3\.\d° · night \(level\)$/);
  });

  it('shows the on-foot scene only while it is attached', () => {
    const conditions = new Conditions(() => '');
    const canvas = { dataset: {} as Record<string, string | undefined> };
    writeSceneMarks(canvas, MARKS);
    const detach = conditions.attachScene(canvas);
    expect(conditions.lines()).toContain(sceneLine(MARKS));
    detach();
    expect(conditions.lines()).toEqual(['switches: none']);
  });
});

describe('context watch', () => {
  it('marks which canvas lost its context', () => {
    const crumbs = new Breadcrumbs({ storage: null, now: () => 0 });
    const canvas = new EventTarget();
    watchContext(canvas, crumbs, undefined, 'on-foot');
    canvas.dispatchEvent(new Event('webglcontextlost'));
    expect(crumbs.current).toEqual(['0.0s context lost: on-foot']);
  });

  it('tells the seconds since the trail started', () => {
    let now = 1000;
    const crumbs = new Breadcrumbs({ storage: null, now: () => now });
    now = 116_200;
    expect(crumbs.elapsed()).toBeCloseTo(115.2);
  });
});

describe('bench header GPU', () => {
  it('names the GPU from a live context, else from the page probe', () => {
    expect(headerGpu('Adreno 750', 'PowerVR')).toBe('Adreno 750');
    expect(headerGpu(null, 'PowerVR D-Series DXT-48-1536')).toBe('PowerVR D-Series DXT-48-1536');
    expect(headerGpu('', 'PowerVR')).toBe('PowerVR');
    expect(headerGpu(null, '')).toBe('unknown');
  });
});
