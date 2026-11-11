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
 * The sky of any instant over a site, from Ventana Lunar's own closed-form
 * sky (`@ventana/sim`, within 0.05° of JPL Horizons in elevation): the Sun
 * and the Earth over the target, the sub-solar and sub-Earth points, the
 * Earth's distance, the point of the Earth under the Moon (which face the
 * Moon sees), the Earth's sub-solar point and its north pole in the Moon's
 * frame, and, where the site has a stored LOLA horizon, how much of the Sun's
 * disc and whether the Earth's centre clear it.
 *
 *   node packages/landing/media-src/moon-scene/scripts/sky.mjs --instant 2026-12-15T05:00:00Z [--site im2]
 */
import { readFileSync } from 'node:fs';
import { gmstDeg } from '../../../../sim/src/dsn-sky.ts';
import { earthSubSolarPoint, subLunarPoint } from '../../../../sim/src/earth-view.ts';
import { subEarthPoint, subPointOf } from '../../../../sim/src/libration.ts';
import { moonPosition } from '../../../../sim/src/moon.ts';
import { skyAt } from '../../../../sim/src/sky.ts';
import { subSolarPoint } from '../../../../sim/src/sun.ts';
import { sunDiscVisible } from '../../../../sim/src/sun-disc.ts';
import { decodeProfile } from '../../../../sim/src/terrain-codec.ts';
import { horizonAt } from '../../../../sim/src/terrain-profile.ts';
import { argOf, siteOf } from './sites.mjs';

const OBLIQUITY_DEG = 23.4393;
const EARTH_RADIUS_KM = 6371.0;
const DEG = Math.PI / 180;
const HORIZONS = new URL('../../../../sim/data/horizons.json', import.meta.url);

const unit = (lat, lon) => [Math.cos(lat * DEG) * Math.cos(lon * DEG), Math.cos(lat * DEG) * Math.sin(lon * DEG), Math.sin(lat * DEG)];
const angle = (a, b) => Math.acos(Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2])) / DEG;

function horizonOf(site) {
  if (!site.horizonId) return null;
  const point = JSON.parse(readFileSync(HORIZONS, 'utf8')).points.find((p) => p.ids.includes(site.horizonId));
  return point ? decodeProfile(point.profile) : null;
}

/** The lit share of the Earth's disc seen from the Moon: (1 + cos phase) / 2. */
function earthLit(subSolar, subEarth) {
  // seen from the Earth the Sun and the Moon are this far apart; the Earth's
  // phase angle seen from the Moon is its supplement (the Sun is ~390 times
  // farther than the Moon, so its direction is the same from both)
  const sun = unit(subSolar.latDeg, subSolar.lonEastDeg);
  const earth = unit(subEarth.latDeg, subEarth.lonEastDeg);
  const phase = angle(sun, earth);
  return { phaseDeg: 180 - phase, lit: (1 + Math.cos((180 - phase) * DEG)) / 2 };
}

/** Everything the scene needs of the sky at `iso` over `site`. */
export function skyOf(site, iso) {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) throw new Error(`bad instant ${iso}`);
  const target = { latDeg: site.latDeg, lonEastDeg: site.lonEastDeg };
  const moon = moonPosition(ms);
  const sky = skyAt(target, ms);
  const subSolar = subSolarPoint(ms);
  const subEarth = subEarthPoint(moon);
  const profile = horizonOf(site);
  return {
    instant: new Date(ms).toISOString(),
    target,
    sun: { elDeg: sky.sunEl, azDeg: sky.sunAz },
    earth: { elDeg: sky.earthEl, azDeg: sky.earthAz, distanceKm: moon.distanceKm, radiusKm: EARTH_RADIUS_KM, ...earthLit(subSolar, subEarth) },
    subSolar,
    subEarth,
    subLunar: subLunarPoint(ms),
    earthSubSolar: earthSubSolarPoint(ms),
    // the Earth's north pole is at ecliptic longitude 90°, latitude 90° - ε;
    // the Moon seen from there is the opposite direction, which subPointOf takes
    earthPole: subPointOf(270, -(90 - OBLIQUITY_DEG), moon),
    gmstDeg: ((gmstDeg(ms) % 360) + 360) % 360,
    dsn: sky.dsn,
    terrain: profile && {
      sunDisc: sunDiscVisible(profile, sky.sunAz, sky.sunEl),
      sunHorizonDeg: horizonAt(profile, sky.sunAz),
      earthHorizonDeg: horizonAt(profile, sky.earthAz),
    },
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const site = siteOf();
  const s = skyOf(site, argOf('instant', '2026-12-15T05:00:00Z'));
  const f = (x) => x.toFixed(2);
  const lines = [
    `${s.instant} over ${site.id} (${site.latDeg}, ${site.lonEastDeg})`,
    `Sun    el ${f(s.sun.elDeg)}° az ${f(s.sun.azDeg)}°`,
    `Earth  el ${f(s.earth.elDeg)}° az ${f(s.earth.azDeg)}°, ${(100 * s.earth.lit).toFixed(1)} % lit, ${f((2 * Math.asin(EARTH_RADIUS_KM / s.earth.distanceKm)) / DEG)}° across`,
    `Sun to Earth ${f(angle(unit(s.sun.elDeg, -s.sun.azDeg), unit(s.earth.elDeg, -s.earth.azDeg)))}° on the sky`,
    `sub-solar ${f(s.subSolar.latDeg)}°, ${f(s.subSolar.lonEastDeg)}°; DSN ${s.dsn}`,
  ];
  if (s.terrain) {
    lines.push(`LOLA horizon: Sun disc ${(100 * s.terrain.sunDisc).toFixed(0)} % visible (terrain ${f(s.terrain.sunHorizonDeg)}°), Earth centre ${f(s.earth.elDeg - s.terrain.earthHorizonDeg)}° over the terrain (${f(s.terrain.earthHorizonDeg)}°)`);
  }
  process.stdout.write(`${lines.join('\n')}\n`);
}
