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
 * The sky of the hero film's instant, from Ventana Lunar's own closed-form
 * sky (`@ventana/sim`, within 0.05° of JPL Horizons in elevation): the Sun
 * and the Earth over IM-2's touchdown point, the sub-solar and sub-Earth
 * points, the Earth's distance, the point of the Earth under the Moon (which
 * face the Moon sees), the Earth's sub-solar point and its north pole in the
 * Moon's frame. Writes `sky.json` beside the composition, which places the
 * Sun and the Earth from it, and prints it against the brief's values.
 *
 *   node packages/landing/media-src/hero-film/scripts/sky.mjs
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { gmstDeg, moonEquatorialKm } from '../../../../sim/src/dsn-sky.ts';
import { earthSubSolarPoint, subLunarPoint } from '../../../../sim/src/earth-view.ts';
import { subEarthPoint, subPointOf } from '../../../../sim/src/libration.ts';
import { moonPosition } from '../../../../sim/src/moon.ts';
import { skyAt } from '../../../../sim/src/sky.ts';
import { subSolarPoint } from '../../../../sim/src/sun.ts';
import { TARGET } from './regions.mjs';

const INSTANT = '2026-11-22T20:00:00Z';
const BRIEF = { sunEl: 6.67, sunAz: 350.0, earthEl: 10.21, earthAz: 324.9, subSolar: [-1.54, 19.26] };
const OBLIQUITY_DEG = 23.4393;

const ms = Date.parse(INSTANT);
const moon = moonPosition(ms);
const sky = skyAt(TARGET, ms);
const subSolar = subSolarPoint(ms);
// The Earth's north pole is at ecliptic longitude 90°, latitude 90° - ε; the
// Moon seen from there is the opposite direction, which subPointOf takes.
const earthPole = subPointOf(270, -(90 - OBLIQUITY_DEG), moon);
const out = {
  instant: INSTANT,
  target: TARGET,
  sun: { elDeg: sky.sunEl, azDeg: sky.sunAz },
  earth: { elDeg: sky.earthEl, azDeg: sky.earthAz, distanceKm: moon.distanceKm, radiusKm: 6371.0 },
  subSolar,
  subEarth: subEarthPoint(moon),
  subLunar: subLunarPoint(ms),
  earthSubSolar: earthSubSolarPoint(ms),
  earthPole,
  gmstDeg: ((gmstDeg(ms) % 360) + 360) % 360,
  moonEquatorialKm: moonEquatorialKm(moon),
  dsn: sky.dsn,
};
const path = fileURLToPath(new URL('../sky.json', import.meta.url));
writeFileSync(path, `${JSON.stringify(out, null, 2)}\n`);

const row = (name, ours, brief) =>
  `${name.padEnd(16)} sim ${ours.toFixed(2).padStart(7)}  brief ${brief.toFixed(2).padStart(7)}  diff ${(ours - brief).toFixed(2)}`;
process.stdout.write(
  [
    row('Sun elevation', sky.sunEl, BRIEF.sunEl),
    row('Sun azimuth', sky.sunAz, BRIEF.sunAz),
    row('Earth elevation', sky.earthEl, BRIEF.earthEl),
    row('Earth azimuth', sky.earthAz, BRIEF.earthAz),
    row('Sub-solar lat', subSolar.latDeg, BRIEF.subSolar[0]),
    row('Sub-solar lon', subSolar.lonEastDeg, BRIEF.subSolar[1]),
    `Earth distance ${moon.distanceKm.toFixed(0)} km, apparent diameter ${((2 * Math.asin(6371 / moon.distanceKm) * 180) / Math.PI).toFixed(2)}°`,
    `wrote ${path}`,
  ].join('\n') + '\n',
);
