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

import { describe, expect, it } from 'vitest';
import { APP_NIGHT, earthPhase, nightEarth } from '../media-src/site-films/scene/light';
import { NIGHT_LIGHT, nightLight } from '../../web/src/terrain/night-light';
import { earthPhase as appEarthPhase } from '../../web/src/terrain/sky-light';
import { FILL, KEY_INTENSITY } from '../../web/src/terrain/scene/sky';
import { EXPOSURE, exposureFor } from '../../web/src/terrain/scene/stage';

// The site films end on the app's lunar night (VENT-115): their constants
// are copies, held here to the app's code so a change there shows.
const SKIES = [
  { sunAz: 108.85, sunEl: 0.04, earthAz: 355.73, earthEl: 4.65 },
  { sunAz: 105.7, sunEl: -1.33, earthAz: 352.51, earthEl: 10.43 },
  { sunAz: 76.32, sunEl: 2.63, earthAz: 322.9, earthEl: 0.2 },
  { sunAz: 161.62, sunEl: -6.01, earthAz: 49.01, earthEl: -1 },
];
const asSite = (s: (typeof SKIES)[number]) => ({
  sun: { azDeg: s.sunAz, elDeg: s.sunEl },
  earth: { azDeg: s.earthAz, elDeg: s.earthEl },
  terrain: null,
});

describe('the site films night light (VENT-115)', () => {
  it('copies the app night constants', () => {
    expect(APP_NIGHT.floor).toBeCloseTo((NIGHT_LIGHT.floor * FILL.intensity) / KEY_INTENSITY, 12);
    expect(APP_NIGHT.earthMax).toBe(NIGHT_LIGHT.earthMax);
    expect(APP_NIGHT.reading).toBe(NIGHT_LIGHT.reading);
    expect(APP_NIGHT.readingAzDeg).toBe(NIGHT_LIGHT.readingAzDeg);
    expect(APP_NIGHT.readingElDeg).toBe(NIGHT_LIGHT.readingElDeg);
    expect(APP_NIGHT.exposureRatio).toBeCloseTo(exposureFor(false) / EXPOSURE, 12);
  });

  it.each(SKIES)('reckons the Earth light as the app does at %o', (sky) => {
    expect(earthPhase(asSite(sky))).toBeCloseTo(appEarthPhase(sky), 12);
    expect(nightEarth(asSite(sky))).toBeCloseTo(nightLight(sky, null).earthshine.intensity, 12);
  });
});
