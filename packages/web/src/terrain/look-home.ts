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

import { stepSpring, type SpringAxis } from '../globe/spring';
import { relativeAzimuth } from './heading-compass';
import { turnLook, type Look } from './view-camera';

/** Spring response, seconds (apple-design: rotation, 0.4 s, as orbit.ts). */
export const HOME_RESPONSE_S = 0.4;

/** The two springs: the yaw unwrapped, so it turns the short way. */
export interface Homing {
  readonly yaw: SpringAxis;
  readonly pitch: SpringAxis;
}

/** The springs from `look` to `home`; null when it is already there. */
export function homingOf(look: Look, home: Look): Homing | null {
  const turn = relativeAzimuth(home.yawDeg, look.yawDeg);
  if (turn === 0 && look.pitchDeg === home.pitchDeg) return null;
  return {
    yaw: { value: look.yawDeg, velocity: 0, target: look.yawDeg + turn },
    pitch: { value: look.pitchDeg, velocity: 0, target: home.pitchDeg },
  };
}

/**
 * The look `dtS` seconds on, and the springs (null once both rest, the
 * look then exactly the opening one). Advances `homing` in place.
 */
export function stepHoming(
  homing: Homing,
  dtS: number,
): { look: Look; homing: Homing | null } {
  const yawMoves = stepSpring(homing.yaw, dtS, HOME_RESPONSE_S);
  const pitchMoves = stepSpring(homing.pitch, dtS, HOME_RESPONSE_S);
  const look = turnLook({ yawDeg: 0, pitchDeg: 0 }, homing.yaw.value,
    homing.pitch.value);
  return { look, homing: yawMoves || pitchMoves ? homing : null };
}
