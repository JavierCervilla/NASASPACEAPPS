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
 * Which point of the Moon faces a body: the optical libration of Meeus
 * «Astronomical Algorithms» (2nd ed.), chapter 53. The Moon's mean equator is
 * tilted I = 1.54242° to the ecliptic and its node coincides with the orbit's
 * (Cassini's laws). The physical libration (at most about 0.04°) is
 * neglected.
 */
import type { MoonPosition } from './moon.ts';
import { wrapDeg, type SelenographicPoint } from './sun.ts';

const DEG = Math.PI / 180;
/** Inclination of the Moon's mean equator to the ecliptic. */
const LUNAR_EQUATOR_TILT = 1.54242 * DEG;

/**
 * The selenographic point under a body, given the ecliptic direction of the
 * Moon as seen from that body (longitude and latitude, degrees).
 */
export function subPointOf(
  moonLonDeg: number,
  moonLatDeg: number,
  moon: MoonPosition,
): SelenographicPoint {
  const w = (moonLonDeg - moon.nodeDeg) * DEG;
  const beta = moonLatDeg * DEG;
  const sinI = Math.sin(LUNAR_EQUATOR_TILT);
  const cosI = Math.cos(LUNAR_EQUATOR_TILT);
  const a = Math.atan2(
    Math.sin(w) * Math.cos(beta) * cosI - Math.sin(beta) * sinI,
    Math.cos(w) * Math.cos(beta),
  );
  const lat = Math.asin(
    -Math.sin(w) * Math.cos(beta) * sinI - Math.sin(beta) * cosI,
  );
  return {
    latDeg: lat / DEG,
    lonEastDeg: wrapDeg(a / DEG - moon.argLatDeg),
  };
}

/** The sub-Earth point: the optical librations in longitude and latitude. */
export function subEarthPoint(moon: MoonPosition): SelenographicPoint {
  return subPointOf(moon.lonDeg, moon.latDeg, moon);
}
