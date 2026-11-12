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
 * The on-foot view's camera (VENT-34, first person only since VENT-54): the
 * eye 2 m over the ground, a look of yaw (azimuth, clockwise from north) and
 * pitch, and how a drag or a key turns it. Directions are x east, y up,
 * z south, as tile-mesh.ts. Pure.
 */

export interface Look {
  /** Azimuth looked at, degrees clockwise from north. */
  readonly yawDeg: number;
  /** Up from level, degrees. */
  readonly pitchDeg: number;
}

export type Vec3 = readonly [number, number, number];

/** The eye over the ground, metres (our choice). */
export const EYE_M = 2;

const RAD = Math.PI / 180;
const PITCH_RANGE = [-60, 80] as const;
export const START_PITCH = 2;

/** The unit vector toward azimuth `azDeg` and elevation `elDeg`. */
export function direction(azDeg: number, elDeg: number): Vec3 {
  const [az, el] = [azDeg * RAD, elDeg * RAD];
  const flat = Math.cos(el);
  return [Math.sin(az) * flat, Math.sin(el), -Math.cos(az) * flat];
}

/** The look the view opens on, toward `yawDeg`. */
export function startLook(yawDeg: number): Look {
  return { yawDeg: wrap(yawDeg), pitchDeg: START_PITCH };
}

const wrap = (deg: number): number => ((deg % 360) + 360) % 360;

/** `look` turned by `yawDeg` and `pitchDeg`, its pitch kept in range. */
export function turnLook(look: Look, yawDeg: number, pitchDeg: number): Look {
  const [low, high] = PITCH_RANGE;
  const pitch = Math.min(Math.max(look.pitchDeg + pitchDeg, low), high);
  return { yawDeg: wrap(look.yawDeg + yawDeg), pitchDeg: pitch };
}

export interface Pose {
  readonly position: Vec3;
  readonly target: Vec3;
}

/**
 * Where the eye stands over a ground `groundY` high, `at` metres east and
 * north of the point (VENT-121: it walks), and what it aims at.
 */
export function cameraPose(
  look: Look,
  groundY: number,
  at: readonly [number, number] = [0, 0],
): Pose {
  const eye: Vec3 = [at[0], groundY + EYE_M, 0 - at[1]];
  const [dx, dy, dz] = direction(look.yawDeg, look.pitchDeg);
  return { position: eye, target: [eye[0] + dx, eye[1] + dy, eye[2] + dz] };
}
