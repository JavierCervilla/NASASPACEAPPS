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
 * Walking in the on-foot view (VENT-121, the human's variant 3A): the ground a tap aims at, the reach, the glide, the
 * words of the chip, the state where the eye stands, the sight from the eye, the eye's latitude and longitude, the
 * rocks around the eye, and the keys that walk.
 */
import { describe, expect, it } from 'vitest';
import { pickGround } from '../src/terrain/walk/ground-pick';
import { AWAY_M, REACH_M, clampReach, isAway } from '../src/terrain/walk/walk-reach';
import { GLIDE_MAX_S, GLIDE_MIN_S, glideCurve, glideDuration, startGlide, stepGlide } from '../src/terrain/walk/glide';
import { bearingOf, distanceText, hereText, whereText } from '../src/terrain/walk/walk-words';
import { eyeState } from '../src/terrain/walk/eye-state';
import { FAR_MARGIN_DEG, clearFromEye, marchElevation } from '../src/terrain/walk/eye-sight';
import { eyeLatLon } from '../src/terrain/walk/eye-point';
import { ROCK_CELL_M, cellBands } from '../src/terrain/walk/rock-cells';
import { MEASURED } from '../src/terrain/rock-law';
import { localSize } from '../src/terrain/ring/ring-local';
import { BLEND_CELLS } from '../src/terrain/ring/ring-window';
import { dragScale, keyLook } from '../src/terrain/look-input';
import { bindLook } from '../src/terrain/scene/controls';
import { walkView } from '../src/terrain/walk/walk-view';
import { viewAlt } from '../src/terrain/view-alt';
import { EN, i18nOf } from './i18n-factories';

const FLAT = () => 0;
const DEG = Math.PI / 180;

/** A ray from 2 m over the point, toward azimuth `az` and `el` degrees under the level. */
const rayDown = (az: number, el: number) => ({
  origin: [0, 2, 0] as const,
  dir: [Math.sin(az * DEG) * Math.cos(el * DEG), -Math.sin(el * DEG), -Math.cos(az * DEG) * Math.cos(el * DEG)] as const,
});

describe('the ground under a pointer', () => {
  it('meets flat ground where the ray drops 2 m: 2 / tan(el) away, on its azimuth', () => {
    const hit = pickGround(rayDown(90, 10), FLAT, 2000);
    expect(hit?.[0]).toBeCloseTo(2 / Math.tan(10 * DEG), 1);
    expect(hit?.[1]).toBeCloseTo(0, 6);
    const north = pickGround(rayDown(0, 45), FLAT, 2000);
    expect(north?.[0]).toBeCloseTo(0, 6);
    expect(north?.[1]).toBeCloseTo(2, 2);
  });

  it('is the sky for a ray over the level, and for one that leaves the loaded relief', () => {
    expect(pickGround(rayDown(0, -5), FLAT, 2000)).toBeNull();
    const island = (e: number, n: number) => (Math.hypot(e, n) < 50 ? 0 : Number.NaN);
    expect(pickGround(rayDown(0, 0.5), island, 2000)).toBeNull();
  });

  it('meets a wall before the ground behind it', () => {
    const wall = (_e: number, n: number) => (n > 100 ? 50 : 0);
    const hit = pickGround(rayDown(0, 0.1), wall, 2000);
    expect(hit?.[1]).toBeGreaterThan(100);
    expect(hit?.[1]).toBeLessThan(102);
  });
});

describe('the reach', () => {
  it('is 1.5 km, inside level 0’s window less its stitch band', () => {
    expect(REACH_M).toBe(1500);
    const cell = localSize(0) / 2 / 128;
    expect(REACH_M).toBeLessThan(31 * 4 * cell - BLEND_CELLS * cell);
  });

  it('holds a place beyond it to its edge along the same line', () => {
    expect(clampReach([300, 400])).toEqual({ at: [300, 400], edge: false });
    const held = clampReach([3000, 4000]);
    expect(held.edge).toBe(true);
    expect(held.at[0]).toBeCloseTo(900, 9);
    expect(held.at[1]).toBeCloseTo(1200, 9);
  });

  it('calls the eye away past a few metres', () => {
    expect(isAway([0, AWAY_M])).toBe(false);
    expect(isAway([0, AWAY_M + 0.1])).toBe(true);
  });
});

describe('the glide', () => {
  it('takes 0.6 s for a step and 2 s for the whole reach, longer the farther', () => {
    expect(glideDuration(0)).toBe(GLIDE_MIN_S);
    expect(glideDuration(REACH_M)).toBe(GLIDE_MAX_S);
    expect(glideDuration(REACH_M * 4)).toBe(GLIDE_MAX_S);
    expect(glideDuration(100)).toBeGreaterThan(glideDuration(10));
  });

  it('runs on a critically damped curve: from rest, never past the target, landing exactly', () => {
    expect(glideCurve(0)).toBe(0);
    expect(glideCurve(1)).toBeCloseTo(1, 12);
    let was = 0;
    for (let t = 0.05; t <= 1; t += 0.05) {
      const k = glideCurve(t);
      expect(k).toBeGreaterThan(was);
      expect(k).toBeLessThanOrEqual(1 + 1e-12);
      was = k;
    }
    expect(glideCurve(0.02)).toBeLessThan(0.02);
  });

  it('steps along the line and ends on the target', () => {
    const glide = startGlide([0, 0], [100, 0]);
    const mid = stepGlide(glide, glide.durationS / 2);
    expect(mid.at[0]).toBeGreaterThan(50);
    expect(mid.at[0]).toBeLessThan(100);
    expect(mid.at[1]).toBe(0);
    const end = stepGlide(mid.glide!, glide.durationS);
    expect(end).toEqual({ at: [100, 0], glide: null });
  });
});

describe('the chip’s words', () => {
  it('gives the bearing from the point clockwise from north', () => {
    expect(bearingOf([0, 10])).toBeCloseTo(0, 9);
    expect(bearingOf([10, 0])).toBeCloseTo(90, 9);
    expect(bearingOf([-10, 0])).toBeCloseTo(270, 9);
  });

  it('writes metres in 10 m steps under 1 km and kilometres with one decimal above', () => {
    expect(distanceText(EN, 184)).toBe('180 m');
    expect(distanceText(EN, 996)).toBe('1.0 km');
    expect(distanceText(EN, 1234)).toBe('1.2 km');
    expect(distanceText(i18nOf('es'), 1234)).toBe('1,2 km');
  });

  it('says where the eye is from the site, on eight points', () => {
    expect(whereText(EN, [130, 130], 'IM-2')).toBe('180 m NE of IM-2');
    expect(whereText(EN, [-1200, 0], 'IM-2')).toBe('1.2 km W of IM-2');
    expect(whereText(i18nOf('es'), [-130, -130], 'IM-2')).toBe('180 m al SO de IM-2');
    expect(whereText(i18nOf('de'), [130, 130], 'IM-2')).toBe('180 m NO von IM-2');
  });

  it('names the state where the eye stands', () => {
    expect(hereText(EN, 'window')).toBe('Window here');
    expect(hereText(EN, 'none')).toBe('Neither here');
  });
});

describe('the state where the eye stands', () => {
  it('is the pill’s rule over the terrain the eye sees', () => {
    expect(eyeState({ sunEl: 2, earthEl: 5, sunClear: true, earthClear: true })).toBe('window');
    expect(eyeState({ sunEl: 2, earthEl: 5, sunClear: false, earthClear: true })).toBe('earth');
    expect(eyeState({ sunEl: 2, earthEl: 5, sunClear: true, earthClear: false })).toBe('sun');
    // The Earth must also be 3° up for a link, as on the pill.
    expect(eyeState({ sunEl: 2, earthEl: 2, sunClear: true, earthClear: true })).toBe('sun');
    expect(eyeState({ sunEl: -1, earthEl: -1, sunClear: false, earthClear: false })).toBe('none');
  });
});

describe('the sight from the eye', () => {
  /** A ridge 100 m high, 1 km north of the point. */
  const ridge = (_e: number, n: number) => (Math.abs(n - 1000) < 20 ? 100 : 0);
  const profileOf = (deg: number) => ({ centiDeg: new Int16Array(720).fill(Math.round(deg * 100)) });

  it('marches the highest elevation along an azimuth from wherever the eye stands', () => {
    const fromPoint = marchElevation(ridge, { at: [0, 0], groundY: 0 }, 0, 4000);
    expect(fromPoint).toBeCloseTo(Math.atan2(98, 980) / DEG, 0);
    const pastIt = marchElevation(ridge, { at: [0, 1200], groundY: 0 }, 0, 4000);
    expect(pastIt).toBeLessThan(0);
  });

  it('drops the profile’s skyline where the march from the point explains it, and keeps it where it does not', () => {
    const body = { azDeg: 0, elDeg: 3 };
    const near = profileOf(5.6);
    expect(clearFromEye(body, { eye: -0.05, point: 5.7 }, near)).toBe(true);
    const far = profileOf(5.6);
    expect(clearFromEye(body, { eye: -0.05, point: 5.6 - 2 * FAR_MARGIN_DEG }, far)).toBe(false);
    expect(clearFromEye(body, { eye: 4, point: 0 }, null)).toBe(false);
    expect(clearFromEye(body, { eye: 2, point: 0 }, null)).toBe(true);
  });
});

describe('the eye’s point', () => {
  it('is the point itself at the origin, and 1.5 km north is about 0.049° of latitude', () => {
    const site = { lat: -84.79, lonEast: 29.2 };
    const here = eyeLatLon(site, [0, 0]);
    expect(here.lat).toBeCloseTo(site.lat, 9);
    expect(here.lonEast).toBeCloseTo(site.lonEast, 9);
    const north = eyeLatLon(site, [0, 1500]);
    expect(north.lat - site.lat).toBeCloseTo(1500 / 1_737_400 / DEG, 4);
    expect(north.lonEast).toBeCloseTo(site.lonEast, 6);
  });
});

describe('the rocks around the eye', () => {
  const law = { ...MEASURED, cap: 10_000 };
  const all = (eye: readonly [number, number]) => {
    const bands = cellBands(7, FLAT, law, eye);
    return Array.from({ length: bands.count }, (_, i) => bands.band(i)).flat();
  };
  const key = (r: { east: number; north: number }) => `${r.east.toFixed(6)},${r.north.toFixed(6)}`;

  it('are the same at a place whichever way the eye came to it', () => {
    expect(all([400, 250]).map(key)).toEqual(all([400, 250]).map(key));
  });

  it('keep the rocks two nearby eyes both reach', () => {
    const a = new Set(all([400, 250]).map(key));
    const b = all([400 + ROCK_CELL_M / 2, 250]);
    const shared = b.filter((r) => Math.hypot(r.east - 400, r.north - 250) < 60 && Math.hypot(r.east - 420, r.north - 250) < 60
      && r.radius > 0.2);
    expect(shared.length).toBeGreaterThan(0);
    expect(shared.every((r) => a.has(key(r)))).toBe(true);
  });

  it('stand around the eye, none under it, none past the law’s reach', () => {
    for (const r of all([-800, 600])) {
      const d = Math.hypot(r.east + 800, r.north - 600);
      expect(d).toBeGreaterThanOrEqual(MEASURED.innerM);
      expect(d).toBeLessThanOrEqual(MEASURED.outerM);
    }
  });

  it('hold the cap', () => {
    const bands = cellBands(7, FLAT, MEASURED, [0, 300]);
    const count = Array.from({ length: bands.count }, (_, i) => bands.band(i)).flat().length;
    expect(count).toBeLessThanOrEqual(MEASURED.cap);
  });
});

describe('the keys never walk (VENT-122)', () => {
  it('give the pitch back to ↑ and ↓, and the turn to ← and →', () => {
    const look = { yawDeg: 0, pitchDeg: 0 };
    expect(keyLook(look, { key: 'ArrowUp', shiftKey: false })).toEqual({ yawDeg: 0, pitchDeg: 3 });
    expect(keyLook(look, { key: 'ArrowDown', shiftKey: false })).toEqual({ yawDeg: 0, pitchDeg: -3 });
    expect(keyLook(look, { key: 'ArrowRight', shiftKey: false })).toEqual({ yawDeg: 5, pitchDeg: 0 });
    expect(keyLook(look, { key: 'PageUp', shiftKey: false })).toBeNull();
  });
});

describe('the view’s pointer and keys', () => {
  const pointer = (type: string, x: number, more: Record<string, unknown> = {}) => {
    const e = new Event(type);
    for (const [k, v] of Object.entries({ button: 0, pointerId: 1, clientX: x, clientY: 0, timeStamp: 0, pointerType: 'mouse', ...more })) {
      Object.defineProperty(e, k, { value: v });
    }
    return e;
  };

  function rig() {
    const el = Object.assign(new EventTarget(), { setPointerCapture: () => undefined }) as unknown as HTMLElement;
    const log: string[] = [];
    const target = { look: () => ({ yawDeg: 90, pitchDeg: 0 }), goHome: () => log.push('home'),
      set: () => log.push('set'), scale: () => dragScale(400, 800, 50),
      fling: () => log.push('fling'), halt: () => (log.push('halt'), false), drag: () => undefined,
      walker: {
        tap: (x: number, _y: number, touch: boolean) => log.push(`tap ${x}${touch ? ' touch' : ''}`),
        hover: (at: { x: number } | null) => log.push(at ? `hover ${at.x}` : 'hover off'),
      } };
    bindLook(el, target);
    return { el, log };
  }

  it('walks on a press that never travels the slop, and turns on one that does', () => {
    const { el, log } = rig();
    el.dispatchEvent(pointer('pointerdown', 100, { pointerType: 'touch' }));
    el.dispatchEvent(pointer('pointermove', 102, { pointerType: 'touch' }));
    el.dispatchEvent(pointer('pointerup', 102, { pointerType: 'touch' }));
    expect(log).toEqual(['halt', 'set', 'tap 102 touch']);
    log.length = 0;
    el.dispatchEvent(pointer('pointerdown', 100));
    el.dispatchEvent(pointer('pointermove', 110));
    el.dispatchEvent(pointer('pointerup', 110));
    expect(log).toEqual(['halt', 'set', 'fling']);
  });

  it('never walks on a cancelled press', () => {
    const { el, log } = rig();
    el.dispatchEvent(pointer('pointerdown', 100));
    el.dispatchEvent(pointer('pointercancel', 100));
    expect(log).toEqual(['halt']);
  });

  it('follows a fine pointer with no button down, never a finger, and hides when it leaves', () => {
    const { el, log } = rig();
    el.dispatchEvent(pointer('pointermove', 50));
    el.dispatchEvent(pointer('pointermove', 60, { pointerType: 'touch' }));
    el.dispatchEvent(new Event('pointerleave'));
    expect(log).toEqual(['hover 50', 'hover off']);
  });

  it('tilts on ↑ and ↓ and never steps the eye', () => {
    const { el, log } = rig();
    const keys = ['ArrowUp', 'ArrowDown'].map((key) => {
      const e = new Event('keydown', { cancelable: true });
      return Object.defineProperties(e, { key: { value: key }, shiftKey: { value: false } });
    });
    for (const key of keys) el.dispatchEvent(key);
    expect(log).toEqual(['set', 'set']);
    expect(keys.every((key) => key.defaultPrevented)).toBe(true);
  });
});

describe('the chip, the edge card and the text alternative', () => {
  const sky = { sunAz: 0, sunEl: 2, earthAz: 90, earthEl: 6 };
  const sight = { sunClear: true, earthClear: true };

  it('shows nothing at the point, and the place and the state away from it', () => {
    expect(walkView(EN, null, sky, 'IM-2')).toBeNull();
    expect(walkView(EN, { at: [2, 2], edge: false, sight }, sky, 'IM-2')).toBeNull();
    const view = walkView(EN, { at: [130, 130], edge: false, sight }, sky, 'IM-2');
    expect(view).toMatchObject({ where: '180 m NE of IM-2', state: 'window', here: 'Window here',
      said: '180 m NE of IM-2 · Window here', edge: null });
  });

  it('reads the state from the eye’s sight, not the point’s', () => {
    const hidden = walkView(EN, { at: [130, 130], edge: false, sight: { sunClear: false, earthClear: true } }, sky, 'IM-2');
    expect(hidden?.here).toBe('Earth here');
  });

  it('writes the edge card’s sentence once the eye was held to the reach', () => {
    const view = walkView(EN, { at: [0, REACH_M], edge: true, sight }, sky, 'IM-2');
    expect(view?.edge).toBe('You are 1.5 km from IM-2. Drop a pin here and the view opens around you, to keep going.');
  });

  it('says in the text alternative where the eye stands, only away from the point', () => {
    const base = { yawDeg: 0, bodies: [], site: 'IM-2' };
    expect(viewAlt(EN, { ...base, where: { at: [0, 0], edge: false, sight: null } })).not.toMatch(/You stand/);
    expect(viewAlt(EN, { ...base, where: { at: [130, 130], edge: false, sight } })).toMatch(/You stand 180 m NE of IM-2\./);
  });
});
