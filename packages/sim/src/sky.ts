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
 * The sky over a lunar point, computed in closed form with no ephemeris file
 * and no network: the Sun (`sun.ts`), the Earth (`moon.ts`, `libration.ts`)
 * and the DSN complex listening (`dsn-sky.ts`). Validated hourly over
 * November and December 2026 against JPL Horizons (`tests/sky.test.ts`).
 */
import { moonElevationsByDsn } from './dsn-sky.ts';
import { DSN_SITES } from './dsn-sites.ts';
import { horizontalOf, unitVector, type Vec3 } from './horizon.ts';
import { subEarthPoint } from './libration.ts';
import { moonPosition } from './moon.ts';
import type { HourSample } from './site.ts';
import { subSolarPoint, type SelenographicPoint } from './sun.ts';
import { HOUR_MS, toIso, toMs } from './time.ts';
import { activeDsn } from './visibility.ts';

/** IAU mean radius of the Moon, km (the sphere Horizons measures on). */
const MOON_RADIUS_KM = 1737.4;

/** What a lander at a point sees at one instant: an hour without its time. */
export type Sky = Omit<HourSample, 't'>;

/**
 * Direction of a body from a lunar site, in the Moon's frame: the body's
 * sub-point pushed back by the site's offset from the Moon's centre (the
 * parallax: about 0.26° for the Earth, nothing for the Sun).
 */
function towardBody(
  sub: SelenographicPoint,
  site: SelenographicPoint,
  radiusOverDistance: number,
): Vec3 {
  const [bx, by, bz] = unitVector(sub.latDeg, sub.lonEastDeg);
  const [sx, sy, sz] = unitVector(site.latDeg, site.lonEastDeg);
  const k = radiusOverDistance;
  return [bx - k * sx, by - k * sy, bz - k * sz];
}

/**
 * The Sun, the Earth and the DSN complex over the lunar point `site` at Unix
 * time `ms`. Pure: the caller passes the time.
 */
export function skyAt(site: SelenographicPoint, ms: number): Sky {
  const moon = moonPosition(ms);
  const sunDir = towardBody(subSolarPoint(ms), site, 0);
  const earthDir = towardBody(
    subEarthPoint(moon),
    site,
    MOON_RADIUS_KM / moon.distanceKm,
  );
  const sun = horizontalOf(sunDir, site.latDeg, site.lonEastDeg);
  const earth = horizontalOf(earthDir, site.latDeg, site.lonEastDeg);
  return {
    sunEl: sun.elDeg,
    sunAz: sun.azDeg,
    earthEl: earth.elDeg,
    earthAz: earth.azDeg,
    dsn: activeDsn(moonElevationsByDsn(DSN_SITES, ms, moon)),
  };
}

/**
 * One {@link HourSample} per whole hour from `fromIso` to `lastIso`, both
 * included, like the server's ephemeris: the first hour is the first whole
 * hour at or after `fromIso`. Empty when `lastIso` is before it.
 */
export function computedHours(
  site: SelenographicPoint,
  fromIso: string,
  lastIso: string,
): HourSample[] {
  const first = Math.ceil(toMs(fromIso) / HOUR_MS) * HOUR_MS;
  const last = toMs(lastIso);
  const hours: HourSample[] = [];
  for (let ms = first; ms <= last; ms += HOUR_MS) {
    hours.push({ t: toIso(ms), ...skyAt(site, ms) });
  }
  return hours;
}
