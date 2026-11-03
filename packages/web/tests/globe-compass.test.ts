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
 * The globe's compass (VENT-50): the Earth mark's place on the ring, from the
 * camera and the sub-Earth point; the words that name it; where the button
 * sits under the phone's bars; and the framer's way back to the opening view.
 */
import type { PerspectiveCamera } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { compassName } from '../src/components/compass/compass-name';
import { compassCovered, compassTop, stackHeight } from '../src/components/compass/compass-top';
import { earthMark, sectorOf } from '../src/globe/earth-mark';
import { cameraPosition, SOUTH_POLE_VIEW, type OrbitPose } from '../src/globe/framing';
import { AIM_MARGIN_PX, offsetForAngle, type AimView } from '../src/globe/site-aim';
import { createOrbit, moveOrbit, poseOf } from '../src/globe/orbit';
import { createSiteFramer } from '../src/globe/site-framer';
import { EN, i18nOf } from './i18n-factories';

/** The Earth over the Moon's mean centre of the near side: the librations are a few degrees. */
const EARTH = { latDeg: 0, lonEastDeg: 0 };
const eyeOf = (pose: OrbitPose) => cameraPosition(pose);
const overhead = (latDeg: number, lonEastDeg: number): OrbitPose => ({ latDeg, lonEastDeg, distance: 5 });

describe('the Earth mark: where the Earth lies on the screen', () => {
  it('opens up and a little left: the equator above the south pole, 30° west of the view', () => {
    const mark = earthMark(eyeOf(SOUTH_POLE_VIEW), EARTH);
    expect(mark.far).toBe(false);
    expect(mark.angleDeg).toBeLessThan(0);
    expect(mark.angleDeg).toBeGreaterThan(-45);
    expect(sectorOf(mark.angleDeg)).toBe('topLeft');
  });

  it('is hollow once the globe is turned 180° in longitude: the Earth is behind the Moon', () => {
    const turned = { ...SOUTH_POLE_VIEW, lonEastDeg: SOUTH_POLE_VIEW.lonEastDeg + 180 };
    expect(earthMark(eyeOf(turned), EARTH).far).toBe(true);
  });

  it('reads the screen like the camera does: north up, east to the right', () => {
    const view = overhead(0, 0);
    expect(earthMark(eyeOf(view), { latDeg: 40, lonEastDeg: 0 }).angleDeg).toBeCloseTo(0, 6);
    expect(earthMark(eyeOf(view), { latDeg: 0, lonEastDeg: 40 }).angleDeg).toBeCloseTo(90, 6);
    expect(Math.abs(earthMark(eyeOf(view), { latDeg: -40, lonEastDeg: 0 }).angleDeg)).toBeCloseTo(180, 6);
    expect(earthMark(eyeOf(view), { latDeg: 0, lonEastDeg: -40 }).angleDeg).toBeCloseTo(-90, 6);
  });

  it('puts an Earth at the view centre at offset 0, and one at the limb at offset 1', () => {
    expect(earthMark(eyeOf(overhead(0, 0)), EARTH).offset).toBeCloseTo(0, 9);
    expect(earthMark(eyeOf(overhead(0, 0)), { latDeg: 0, lonEastDeg: 90 }).offset).toBeCloseTo(1, 9);
  });

  it('turns hollow exactly at the limb: the camera at 5 Moon radii sees 78.46° around its centre', () => {
    const view = eyeOf(overhead(0, 0));
    expect(earthMark(view, { latDeg: 0, lonEastDeg: 78 }).far).toBe(false);
    expect(earthMark(view, { latDeg: 0, lonEastDeg: 79 }).far).toBe(true);
  });

  it('keeps the direction a far-side Earth would be seen in, behind the Moon', () => {
    const behind = earthMark(eyeOf(overhead(0, 0)), { latDeg: 0, lonEastDeg: 100 });
    expect(behind.far).toBe(true);
    expect(behind.angleDeg).toBeCloseTo(90, 6);
  });

  it('stays filled as the globe zooms in on the opening view, down to the closest zoom: a zoom does not turn the Moon (VENT-51)', () => {
    for (const distance of [8, 5, 3, 2.4, 2, 1.6]) {
      expect(earthMark(eyeOf({ ...SOUTH_POLE_VIEW, distance }), EARTH).far, `${distance}`).toBe(false);
    }
  });

  it('stays hollow as the globe zooms in on the far side', () => {
    for (const distance of [8, 5, 1.6]) {
      const turned = { ...SOUTH_POLE_VIEW, lonEastDeg: SOUTH_POLE_VIEW.lonEastDeg + 180, distance };
      expect(earthMark(eyeOf(turned), EARTH).far, `${distance}`).toBe(true);
    }
  });

  it('names eight directions of 45° around the ring', () => {
    const named = [0, 45, 90, 135, 180, -180, -135, -90, -45, 20, -20, 70].map(sectorOf);
    expect(named).toEqual([
      'top', 'topRight', 'right', 'bottomRight', 'bottom', 'bottom', 'bottomLeft', 'left', 'topLeft',
      'top', 'top', 'right',
    ]);
  });
});

describe('the compass button\'s name', () => {
  const near = earthMark(eyeOf(SOUTH_POLE_VIEW), EARTH);
  const far = earthMark(eyeOf({ ...SOUTH_POLE_VIEW, lonEastDeg: 210 }), EARTH);
  const centred = earthMark(eyeOf(overhead(0, 0)), EARTH);

  it('says where the Earth is and what a press does', () => {
    expect(compassName(EN, near)).toBe(
      'Earth is toward the top left of the Moon. Press to return the globe to its opening view.',
    );
  });

  it('says so when the Earth is behind the Moon, and when it is at the centre', () => {
    expect(compassName(EN, far)).toContain('Earth is behind the Moon');
    expect(compassName(EN, centred)).toBe(
      'Earth is at the centre of the view. Press to return the globe to its opening view.',
    );
  });

  it('speaks in the visitor\'s language', () => {
    expect(compassName(i18nOf('es'), near)).toContain('arriba a la izquierda');
    expect(compassName(i18nOf('de'), near)).toContain('oben links');
  });
});

describe('where the compass sits under the phone\'s bars', () => {
  it('goes one gap under the top bar', () => {
    expect(compassTop(84, null)).toBe(92);
  });

  it('goes one gap under the first-time hint too, while it shows: the hint is one gap under the bar', () => {
    expect(compassTop(84, 44)).toBe(84 + 8 + 44 + 8);
  });

  it('stands while its whole button is above the sheet\'s top edge (VENT-51)', () => {
    expect(compassCovered(92, 48, 330)).toBe(false);
    expect(compassCovered(92, 48, 140)).toBe(false);
    expect(compassCovered(92, 48, null)).toBe(false);
  });

  it('is covered once the sheet\'s edge rises over it: at 200 % text the half sheet reaches the full detent', () => {
    expect(compassCovered(92, 48, 139)).toBe(true);
    expect(compassCovered(compassTop(207, null), 48, 220)).toBe(true);
  });
});

/** The 360 px phone of the site framer's tests: the sheet at half, a band from 81 to 315. */
const PHONE: AimView = { frameTop: 0, frameHeight: 490, distance: 5, band: { top: 81, bottom: 315 } };
const IM2 = { lat: -84.79, lonEast: 29.2 };
/** Statio Shiv Shakti: far enough from the pole for the band to move its framing. */
const SHIV_SHAKTI = { lat: -69.37, lonEast: 32.32 };

describe('the framer\'s way home', () => {
  const setUp = (reducedMotion = true) => {
    const orbit = createOrbit(SOUTH_POLE_VIEW);
    const view = { enabled: true, fullWidth: 360, fullHeight: 490, offsetX: 0, offsetY: -0, width: 360, height: 780 };
    const camera = { view } as unknown as Pick<PerspectiveCamera, 'view'>;
    let current = PHONE.band;
    let heard = (): void => undefined;
    const band = { band: () => current, watch: (fn: () => void) => ((heard = fn), () => undefined) };
    const invalidate = vi.fn();
    const framer = createSiteFramer({ orbit, camera, band, invalidate, reducedMotion: () => reducedMotion });
    const moveBand = (next: typeof current): void => {
      current = next;
      heard();
    };
    return { orbit, framer, invalidate, moveBand };
  };
  const landsAt = (siteLat: number, cameraLat: number): number =>
    PHONE.frameTop + PHONE.frameHeight / 2 + offsetForAngle(cameraLat - siteLat, PHONE.distance, PHONE.frameHeight);

  it('returns a dragged and zoomed globe to the opening view, and frames the selected site in the band', () => {
    const { orbit, framer } = setUp();
    framer.hold(IM2);
    const opening = poseOf(orbit);
    moveOrbit(orbit, { latDeg: 30, lonEastDeg: 140, distance: 2 }, true);
    framer.home(IM2);
    expect(poseOf(orbit)).toEqual(opening);
    expect(landsAt(IM2.lat, poseOf(orbit).latDeg)).toBeCloseTo(315 - AIM_MARGIN_PX, 6);
  });

  it('opens on the south pole view alone when no site is selected', () => {
    const { orbit, framer } = setUp();
    moveOrbit(orbit, { latDeg: 30, lonEastDeg: 140, distance: 2 }, true);
    framer.home(null);
    expect(poseOf(orbit)).toEqual(SOUTH_POLE_VIEW);
  });

  it('takes the short way round the Moon in longitude', () => {
    const { orbit, framer } = setUp(false);
    moveOrbit(orbit, { latDeg: 0, lonEastDeg: 340 - SOUTH_POLE_VIEW.lonEastDeg, distance: 0 }, true);
    framer.home(null);
    expect(orbit.lon.target - orbit.lon.value).toBeCloseTo(50, 9);
  });

  it('lets the springs carry the camera unless motion is reduced, and asks for a frame', () => {
    const { orbit, framer, invalidate } = setUp(false);
    moveOrbit(orbit, { latDeg: 30, lonEastDeg: 140, distance: 2 }, true);
    framer.home(null);
    expect(orbit.lat.value).not.toBe(SOUTH_POLE_VIEW.latDeg);
    expect(orbit.lat.target).toBe(SOUTH_POLE_VIEW.latDeg);
    expect(invalidate).toHaveBeenCalled();
  });

  it('keeps following the band afterwards, as after any framing', () => {
    const { orbit, framer, moveBand } = setUp();
    moveOrbit(orbit, { latDeg: 30, lonEastDeg: 0, distance: 0 }, true);
    framer.home(SHIV_SHAKTI);
    // The framer does not take its own landing for a move of the user's: a moved band re-frames.
    moveBand({ top: 81, bottom: 230 });
    expect(landsAt(SHIV_SHAKTI.lat, poseOf(orbit).latDeg)).toBeCloseTo(230 - AIM_MARGIN_PX, 6);
  });
});

describe('stackHeight (VENT-52)', () => {
  it('is null when nothing stacks under the bar (a hidden row is 0 px high)', () => {
    expect(stackHeight([])).toBeNull();
    expect(stackHeight([0])).toBeNull();
  });

  it('is one item’s height, or the row and the hint with a gap between', () => {
    expect(stackHeight([0, 52])).toBe(52);
    expect(stackHeight([52, 0])).toBe(52);
    expect(stackHeight([52, 44])).toBe(52 + 8 + 44);
  });

  it('puts the compass under the stack', () => {
    expect(compassTop(100, stackHeight([52, 44]))).toBe(100 + 8 + 104 + 8);
  });
});
