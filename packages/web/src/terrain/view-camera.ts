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
 * The on-foot view's camera (VENT-34), as numbers: third person (behind
 * and above the astronaut, the human's default) or first person (the eye
 * 2 m over the ground), a look of yaw (azimuth, clockwise from north) and
 * pitch, and how a drag or a key turns it. Directions are x east, y up,
 * z south, as tile-mesh.ts. Pure.
 */

export type CameraMode = 'third' | 'first';

export interface Look {
  /** Azimuth looked at, degrees clockwise from north. */
  readonly yawDeg: number;
  /** First person: up from level; third person: the orbit's height. */
  readonly pitchDeg: number;
}

export type Vec3 = readonly [number, number, number];

/** The eye over the ground in first person, metres (our choice). */
export const EYE_M = 2;
/** The camera's distance behind the astronaut in third person, metres. */
export const ORBIT_M = 7.5;
/** Where the third-person camera aims: the astronaut's chest, metres. */
export const CHEST_M = 1.1;

const RAD = Math.PI / 180;
const PITCH_RANGE: Readonly<Record<CameraMode, readonly [number, number]>> = {
  first: [-60, 80],
  third: [3, 60],
};
const START_PITCH: Readonly<Record<CameraMode, number>> = {
  first: 2,
  third: 14,
};

/** The unit vector toward azimuth `azDeg` and elevation `elDeg`. */
export function direction(azDeg: number, elDeg: number): Vec3 {
  const [az, el] = [azDeg * RAD, elDeg * RAD];
  const flat = Math.cos(el);
  return [Math.sin(az) * flat, Math.sin(el), -Math.cos(az) * flat];
}

/** The look a mode opens on, toward `yawDeg`. */
export function startLook(mode: CameraMode, yawDeg: number): Look {
  return { yawDeg: wrap(yawDeg), pitchDeg: START_PITCH[mode] };
}

const wrap = (deg: number): number => ((deg % 360) + 360) % 360;

/** `look` turned by `yawDeg` and `pitchDeg`, its pitch kept in range. */
export function turnLook(
  mode: CameraMode,
  look: Look,
  yawDeg: number,
  pitchDeg: number,
): Look {
  const [low, high] = PITCH_RANGE[mode];
  const pitch = Math.min(Math.max(look.pitchDeg + pitchDeg, low), high);
  return { yawDeg: wrap(look.yawDeg + yawDeg), pitchDeg: pitch };
}

export interface Pose {
  readonly position: Vec3;
  readonly target: Vec3;
}

/**
 * Where the camera stands and what it aims at, over a ground `groundY`
 * high at the point; third person keeps `clearY` (the ground under the
 * camera) half a metre below it.
 */
export function cameraPose(
  mode: CameraMode,
  look: Look,
  groundY: number,
  clearY: (east: number, north: number) => number,
): Pose {
  if (mode === 'first') {
    const eye: Vec3 = [0, groundY + EYE_M, 0];
    const [dx, dy, dz] = direction(look.yawDeg, look.pitchDeg);
    return { position: eye, target: [dx, eye[1] + dy, dz] };
  }
  const target: Vec3 = [0, groundY + CHEST_M, 0];
  const [bx, by, bz] = direction(look.yawDeg + 180, look.pitchDeg);
  const [x, z] = [bx * ORBIT_M, bz * ORBIT_M];
  const y = Math.max(target[1] + by * ORBIT_M, clearY(x, -z) + 0.5);
  return { position: [x, y, z], target };
}
