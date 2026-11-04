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
 * The angles of the ground's light (VENT-62): the phase angle between the
 * Sun and the eye, and flat ground's cosines. Pure.
 */
const RAD = Math.PI / 180;

/**
 * The phase angle, degrees, between the Sun at `sunElDeg` and an eye at
 * `viewElDeg` whose bearing from the ground point is `azDeg` away from the
 * Sun's (0: the eye lies toward the Sun, the ground is down-sun of it).
 */
export function phaseAngleDeg(
  sunElDeg: number,
  viewElDeg: number,
  azDeg: number,
): number {
  const [s, v, az] = [sunElDeg * RAD, viewElDeg * RAD, azDeg * RAD];
  const cos = Math.cos(s) * Math.cos(v) * Math.cos(az)
    + Math.sin(s) * Math.sin(v);
  return Math.acos(Math.min(Math.max(cos, -1), 1)) / RAD;
}

/** Flat ground seen from `viewElDeg` up: the cosines and the phase. */
export function sunUpGeometry(
  sunElDeg: number,
  viewElDeg: number,
  azDeg: number,
): { mu0: number; mu: number; alphaDeg: number } {
  return { mu0: Math.sin(sunElDeg * RAD), mu: Math.sin(viewElDeg * RAD),
    alphaDeg: phaseAngleDeg(sunElDeg, viewElDeg, azDeg) };
}
