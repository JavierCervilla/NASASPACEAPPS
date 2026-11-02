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
 * The far horizon's backdrop (VENT-34, VENT-46): the rings reach 128 km (32
 * on the lowest tier); a ridge beyond is the profile's. A wall round the
 * point, beyond the rings' corners (ring-plan.ts `backdropM`), whose top
 * stands at the
 * profile's elevation angle in each of its azimuth bins (packages/sim
 * terrain-profile.ts, read from the eye as the profile was) and whose foot
 * sinks far below the tile's edge, so no gap shows between them. Without a
 * profile, the smooth sphere's horizon: the dip from the eye's height.
 * Pure: positions only.
 */
import { horizonAt, type HorizonProfile } from '@ventana/sim';
import { EYE_M, direction } from './view-camera';
import { MOON_RADIUS_M } from './tile-mesh';

/** How far under the level its foot goes, degrees. */
const FOOT_DEG = -12;
const RAD = Math.PI / 180;

/** The smooth sphere's horizon from an eye `eyeM` up, degrees. */
export const dipDeg = (eyeM: number): number =>
  -Math.acos(MOON_RADIUS_M / (MOON_RADIUS_M + eyeM)) / RAD;

/** The backdrop's top elevation at `azDeg`, degrees. */
export function backdropTopDeg(
  profile: HorizonProfile | null,
  azDeg: number,
): number {
  return profile ? horizonAt(profile, azDeg) : dipDeg(EYE_M);
}

/**
 * The wall's vertices, a top and a foot per azimuth step (bins + 1, the
 * last closing on the first), around an eye at `eyeY`; and its triangles.
 */
export function backdropWall(
  profile: HorizonProfile | null,
  eyeY: number,
  bins: number,
  radiusM: number,
): { positions: Float32Array; index: Uint32Array } {
  const positions = new Float32Array((bins + 1) * 6);
  const index = new Uint32Array(bins * 6);
  for (let i = 0; i <= bins; i++) {
    const az = (i * 360) / bins;
    const [x, , z] = direction(az, 0);
    const top = Math.tan(backdropTopDeg(profile, az) * RAD) * radiusM;
    const foot = Math.tan(FOOT_DEG * RAD) * radiusM;
    positions.set([x * radiusM, eyeY + top, z * radiusM], i * 6);
    positions.set([x * radiusM, eyeY + foot, z * radiusM], i * 6 + 3);
    if (i < bins) {
      const [t, f] = [i * 2, i * 2 + 1];
      index.set([t, t + 2, f, f, t + 2, t + 3], i * 6);
    }
  }
  return { positions, index };
}
