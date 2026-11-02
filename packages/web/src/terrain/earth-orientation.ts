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
 * How the Earth is turned in the Moon's sky (VENT-34), so the Blue Marble
 * map shows the face the Moon sees. The sub-lunar point (sim `subLunarPoint`)
 * says which point of the Earth faces the site; the Earth's pole then lies
 * at the position angle that the ecliptic gives it: the Moon's axis is
 * within 1.5° of the ecliptic's, so the ecliptic north seen from a site is
 * the Moon's north projected on the sky (at the south pole: toward the
 * horizon, the Earth looks upside down), and the Earth's pole leans from it
 * by `atan2(-sin(eps) cos(L), cos(eps))`, L the Moon's ecliptic longitude.
 * Accurate to a couple of degrees (libration and the Moon's 1.5° tilt are
 * left out): a disc 35 px wide cannot show more. Pure.
 */
import { cross, dot, mix, unit } from './vec3';
import type { Vec3 } from './view-camera';

const RAD = Math.PI / 180;
/** The Earth's obliquity at J2000, radians. */
const EPS = 23.439_291 * RAD;

export interface SpinInput {
  /** The unit vector toward the Earth, in the scene's frame. */
  readonly toward: Vec3;
  /** The site's latitude, degrees. */
  readonly siteLatDeg: number;
  /** The point of the Earth under the Moon, degrees. */
  readonly subLunar: { readonly latDeg: number; readonly lonEastDeg: number };
  /** The Moon's ecliptic longitude, degrees. */
  readonly moonLonDeg: number;
}

/** The Earth's pole in the scene's frame. */
export function earthPole(input: SpinInput): Vec3 {
  const sight = input.toward;
  const beta = input.siteLatDeg * RAD;
  const moonNorth: Vec3 = [0, Math.sin(beta), -Math.cos(beta)];
  const up = unit(mix(moonNorth, 1, sight, -dot(moonNorth, sight)));
  const left = cross(up, sight);
  const moonLon = input.moonLonDeg * RAD;
  const roll = Math.atan2(-Math.sin(EPS) * Math.cos(moonLon), Math.cos(EPS));
  const phi = input.subLunar.latDeg * RAD;
  const across = mix(up, Math.cos(roll), left, Math.sin(roll));
  return mix(mix(sight, -Math.sin(phi), sight, 0), 1, across, Math.cos(phi));
}

/**
 * The 3 x 3 matrix, row-major, that takes a direction in the scene to the
 * Earth's body frame (x toward 90° E, y the pole, z toward 0° E on the
 * equator), where the shader reads latitude and longitude.
 */
export function earthToBody(input: SpinInput): number[] {
  const toSite = mix(input.toward, -1, input.toward, 0);
  const phi = input.subLunar.latDeg * RAD;
  const lam = input.subLunar.lonEastDeg * RAD;
  const pole = earthPole(input);
  const h = unit(mix(toSite, 1, pole, -Math.sin(phi)));
  const world = [h, pole, cross(pole, h)];
  const body: Vec3[] = [[Math.sin(lam), 0, Math.cos(lam)], [0, 1, 0],
    [Math.cos(lam), 0, -Math.sin(lam)]];
  const row = (i: number): number[] => [0, 1, 2].map((j) =>
    body.reduce((sum, b, c) => sum + b[i]! * world[c]![j]!, 0));
  return [...row(0), ...row(1), ...row(2)];
}
