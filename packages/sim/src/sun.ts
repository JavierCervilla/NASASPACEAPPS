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
 * Where the Sun stands overhead on the Moon: the sub-solar point, from a
 * closed-form model with no ephemeris file and no network.
 *
 * Method: Meeus, «Astronomical Algorithms» (2nd ed.), chapter 53 (the
 * selenographic position of the Sun), simplified. The Sun's true ecliptic
 * longitude comes from the low-precision solar theory of chapter 25; the
 * Moon's mean longitude, argument of latitude and node from chapter 47; the
 * Moon's equator is tilted I = 1.54242° to the ecliptic (Cassini's laws).
 * Neglected: the Sun's ecliptic latitude and the Moon's distance from the
 * Earth (at most 0.15° on the longitude), nutation, aberration, physical
 * libration and TT - UTC (about 0.01° each).
 *
 * Accuracy, against JPL Horizons quantity 15 (Sun sub-longitude and
 * sub-latitude on the Moon, DE441, ME frame), daily over November and
 * December 2026: at most 0.17° in longitude and 0.04° in latitude
 * (`tests/sun.test.ts` holds it under 0.5°).
 */

/** A point on the Moon, in selenographic degrees. */
export interface SelenographicPoint {
  /** Latitude, negative to the south. */
  readonly latDeg: number;
  /** Longitude, positive to the east, in [-180, 180). */
  readonly lonEastDeg: number;
}

const DEG = Math.PI / 180;
const J2000_JD = 2_451_545;
const UNIX_EPOCH_JD = 2_440_587.5;
const DAY_MS = 86_400_000;
/** Inclination of the Moon's mean equator to the ecliptic. */
const LUNAR_EQUATOR_TILT = 1.54242 * DEG;

/** Wraps an angle in degrees into [-180, 180). */
export function wrapDeg(deg: number): number {
  return ((((deg + 180) % 360) + 360) % 360) - 180;
}

/** Julian centuries since J2000.0 of a Unix time in ms (UTC as TT). */
function centuriesSinceJ2000(ms: number): number {
  return (ms / DAY_MS + UNIX_EPOCH_JD - J2000_JD) / 36_525;
}

/** The Sun's true geometric ecliptic longitude, in degrees (Meeus 25). */
function sunTrueLongitude(t: number): number {
  const meanLongitude = 280.46646 + 36_000.76983 * t;
  const anomaly = (357.52911 + 35_999.05029 * t) * DEG;
  const centre =
    (1.914602 - 0.004817 * t) * Math.sin(anomaly) +
    (0.019993 - 0.000101 * t) * Math.sin(2 * anomaly) +
    0.000289 * Math.sin(3 * anomaly);
  return meanLongitude + centre;
}

/**
 * The sub-solar point on the Moon at Unix time `ms`: where the Sun is at the
 * zenith. Pure: the caller passes the time.
 */
export function subSolarPoint(ms: number): SelenographicPoint {
  const t = centuriesSinceJ2000(ms);
  const node = 125.0445479 - 1934.1362891 * t;
  const argumentOfLatitude = 93.272095 + 483_202.0175233 * t;
  // The Moon as seen from the Sun, measured from the node of its equator.
  const w = (sunTrueLongitude(t) + 180 - node) * DEG;
  const a = Math.atan2(
    Math.sin(w) * Math.cos(LUNAR_EQUATOR_TILT),
    Math.cos(w),
  );
  const lat = Math.asin(-Math.sin(w) * Math.sin(LUNAR_EQUATOR_TILT));
  return {
    latDeg: lat / DEG,
    lonEastDeg: wrapDeg(a / DEG - argumentOfLatitude),
  };
}
