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

import type { PerspectiveCamera } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { createOrbit, moveOrbit, poseOf } from '../src/globe/orbit';
import { AIM_MARGIN_PX, aimLatitude, angleForOffset, offsetForAngle, type AimView } from '../src/globe/site-aim';
import { createSiteFramer } from '../src/globe/site-framer';

/** A 360 px phone: a 490 px frame from the top, the top bar's bottom at 81, a band down to 315. */
const PHONE: AimView = { frameTop: 0, frameHeight: 490, distance: 5, band: { top: 81, bottom: 315 } };
/** IM-2 (Mons Mouton) and the opening view's latitude. */
const IM2 = { lat: -84.79, lonEast: 29.2 };
const OPENING_LAT = -62;
/** Statio Shiv Shakti (Chandrayaan-3 Vikram), far enough from the pole for any nudge. */
const SHIV_SHAKTI = { lat: -69.37, lonEast: 32.32 };

/** Where a site lands, px from the host's top, for a camera at `cameraLat` on its meridian. */
const landsAt = (siteLat: number, cameraLat: number, view: AimView): number =>
  view.frameTop + view.frameHeight / 2 + offsetForAngle(cameraLat - siteLat, view.distance, view.frameHeight);

describe('site aim: projection along the meridian', () => {
  it('puts the point looked down on at the frame centre, and a point to the south below it', () => {
    expect(offsetForAngle(0, 5, 490)).toBe(0);
    // The opening view put IM-2 74 px below the centre at 360x780 (QA F1: y 319 against a 245 centre).
    expect(offsetForAngle(OPENING_LAT - IM2.lat, 5, 490)).toBeCloseTo(74, 0);
    expect(offsetForAngle(-10, 5, 490)).toBeLessThan(0);
  });

  it('inverts: the angle for an offset lands the point back on that offset', () => {
    for (const px of [-120, -47, 0, 31, 150]) {
      expect(offsetForAngle(angleForOffset(px, 5, 490), 5, 490)).toBeCloseTo(px, 6);
    }
  });

  it('holds the angle short of the limb for an offset past the disc', () => {
    expect(Number.isFinite(angleForOffset(10_000, 5, 490))).toBe(true);
    expect(angleForOffset(10_000, 5, 490)).toBeLessThan(90);
  });
});

describe('site aim: the free band', () => {
  it('leaves the camera alone while the site already lands in the band', () => {
    // A site picked in the list lands at the centre, 245, inside 81..315 with the margin.
    expect(aimLatitude(IM2.lat, IM2.lat, PHONE)).toBe(IM2.lat);
    expect(aimLatitude(-69.37, -60, { ...PHONE, band: { top: 0, bottom: 780 } })).toBe(-60);
  });

  it('nudges a site below the band up to its lower edge, the margin above it', () => {
    const lat = aimLatitude(IM2.lat, OPENING_LAT, PHONE);
    expect(lat).toBeLessThan(OPENING_LAT);
    expect(landsAt(IM2.lat, lat, PHONE)).toBeCloseTo(315 - AIM_MARGIN_PX, 6);
  });

  it('nudges a site under the top bar down to the band\'s upper edge', () => {
    expect(landsAt(0, -60, PHONE)).toBeLessThan(81 + AIM_MARGIN_PX);
    const lat = aimLatitude(0, -60, PHONE);
    expect(landsAt(0, lat, PHONE)).toBeCloseTo(81 + AIM_MARGIN_PX, 6);
  });

  it('takes the band\'s middle when the band is too short for the margin on both sides', () => {
    const view = { ...PHONE, band: { top: 200, bottom: 240 } };
    expect(landsAt(-60, aimLatitude(-60, -60, view), view)).toBeCloseTo(220, 6);
  });

  it('works in the frame where the sheet slid it, and for its height', () => {
    const view: AimView = { frameTop: 145, frameHeight: 554, distance: 3, band: { top: 72, bottom: 400 } };
    const lat = aimLatitude(-80, -80, view);
    expect(landsAt(-80, lat, view)).toBeCloseTo(400 - AIM_MARGIN_PX, 6);
  });
});

describe('site framer', () => {
  /** A camera framed as on the 360x780 phone at half, and a free band that can change. */
  const setUp = (reducedMotion = true) => {
    const orbit = createOrbit({ latDeg: OPENING_LAT, lonEastDeg: 30, distance: 5 });
    const view = { enabled: true, fullWidth: 360, fullHeight: 490, offsetX: 0, offsetY: -0, width: 360, height: 780 };
    const camera = { view } as unknown as Pick<PerspectiveCamera, 'view'>;
    let band = PHONE.band;
    let heard = (): void => undefined;
    const freeBand = { band: () => band, watch: (fn: () => void) => ((heard = fn), () => undefined) };
    const invalidate = vi.fn();
    const framer = createSiteFramer({ orbit, camera, band: freeBand, invalidate, reducedMotion: () => reducedMotion });
    const moveBand = (next: typeof band): void => {
      band = next;
      heard();
    };
    return { orbit, framer, moveBand, invalidate };
  };

  it('at load nudges the selected site into the band above the sheet, at once under reduced motion', () => {
    const { orbit, framer } = setUp();
    framer.hold(IM2);
    expect(landsAt(IM2.lat, poseOf(orbit).latDeg, PHONE)).toBeCloseTo(315 - AIM_MARGIN_PX, 6);
    expect(poseOf(orbit).lonEastDeg).toBe(30);
  });

  it('with motion allowed moves the target and lets the springs carry the camera', () => {
    const { orbit, framer } = setUp(false);
    framer.hold(IM2);
    expect(orbit.lat.value).toBe(OPENING_LAT);
    expect(orbit.lat.target).toBeLessThan(OPENING_LAT);
  });

  it('re-frames when the band moves off the site, until the user moves the globe', () => {
    const { orbit, framer, moveBand } = setUp();
    framer.hold(SHIV_SHAKTI);
    moveBand({ top: 81, bottom: 230 });
    expect(landsAt(SHIV_SHAKTI.lat, poseOf(orbit).latDeg, PHONE)).toBeCloseTo(230 - AIM_MARGIN_PX, 6);
    // A drag: the view is the user's now.
    moveOrbit(orbit, { latDeg: 5, lonEastDeg: 3, distance: 0 }, true);
    const dragged = poseOf(orbit);
    moveBand({ top: 81, bottom: 200 });
    expect(poseOf(orbit)).toEqual(dragged);
  });

  it('does not move at load once the user has turned the globe', () => {
    const { orbit, framer } = setUp();
    moveOrbit(orbit, { latDeg: 0, lonEastDeg: 10, distance: 0 }, true);
    const turned = poseOf(orbit);
    framer.hold(IM2);
    expect(poseOf(orbit)).toEqual(turned);
  });

  it('flies to a picked site after a drag, and frames it in the band', () => {
    const { orbit, framer, moveBand } = setUp();
    moveOrbit(orbit, { latDeg: 0, lonEastDeg: 10, distance: 0 }, true);
    framer.fly(SHIV_SHAKTI);
    expect(poseOf(orbit).latDeg).toBe(SHIV_SHAKTI.lat);
    expect(poseOf(orbit).lonEastDeg).toBeCloseTo(SHIV_SHAKTI.lonEast, 9);
    moveBand({ top: 81, bottom: 230 });
    expect(landsAt(SHIV_SHAKTI.lat, poseOf(orbit).latDeg, PHONE)).toBeCloseTo(230 - AIM_MARGIN_PX, 6);
    expect(poseOf(orbit).lonEastDeg).toBeCloseTo(SHIV_SHAKTI.lonEast, 9);
  });

  it('stops at the orbit\'s latitude limit: a polar site cannot rise above the frame centre', () => {
    const { orbit, framer, moveBand } = setUp();
    framer.fly(IM2);
    moveBand({ top: 81, bottom: 250 });
    expect(poseOf(orbit).latDeg).toBe(-85);
  });

  it('stops framing on hold(null): a marker tapped on the globe', () => {
    const { orbit, framer, moveBand } = setUp();
    framer.hold(null);
    moveBand({ top: 81, bottom: 200 });
    expect(poseOf(orbit).latDeg).toBe(OPENING_LAT);
  });
});
