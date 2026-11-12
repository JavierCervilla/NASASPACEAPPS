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
 * Whether the Sun and the Earth show from where the eye stands (VENT-121),
 * once it has walked away from the point. At the point the horizon profile
 * decides, as the card does (VENT-59, ridge.ts `blockerOf`). Away from it,
 * the loaded relief is marched from the eye along each body's azimuth out
 * to the rings' reach (the near ground, then the rings' heights out to 128
 * km); the point's profile still counts where it stands over the same march
 * from the point by more than {@link FAR_MARGIN_DEG}, which is terrain
 * beyond the rings. That far part is read as the point sees it: an eye at
 * most 1.5 km away sees a skyline past 128 km within about 0.1° of that
 * (1.5 km of parallax, the two grounds' height difference over the
 * distance), the small error this leaves. Pure.
 */
import { horizonAt, type HorizonProfile } from '@ventana/sim';
import { dipDeg } from '../far-horizon';
import { EYE_M, direction } from '../view-camera';
import type { HeightAt } from './ground-pick';
import type { EastNorth } from './walk-reach';

/** How far the march goes, metres: the coarsest ring's half side. */
export const SIGHT_M = 128_000;
/** The profile over the point's own march by more: terrain beyond. */
export const FAR_MARGIN_DEG = 0.3;
const FIRST_STEP_M = 8;
const STEP_SHARE = 0.01;
const DEG = 180 / Math.PI;

export interface Standing {
  readonly at: EastNorth;
  /** The frame's y of the ground there. */
  readonly groundY: number;
}

/** The highest elevation of the relief from `from` along `azDeg`. */
export function marchElevation(
  heightAt: HeightAt,
  from: Standing,
  azDeg: number,
  maxM: number = SIGHT_M,
): number {
  const [dx, , dz] = direction(azDeg, 0);
  const eyeY = from.groundY + EYE_M;
  let best = dipDeg(EYE_M);
  for (let d = FIRST_STEP_M; d <= maxM; d += FIRST_STEP_M + d * STEP_SHARE) {
    const y = heightAt(from.at[0] + dx * d, from.at[1] - dz * d);
    if (Number.isNaN(y)) break;
    best = Math.max(best, Math.atan2(y - eyeY, d) * DEG);
  }
  return best;
}

export interface Body {
  readonly azDeg: number;
  readonly elDeg: number;
}

/**
 * Whether `body` shows over the skyline the eye sees: `eye` and `point`
 * are the marches from the eye and from the point along its azimuth.
 */
export function clearFromEye(
  body: Body,
  marches: { readonly eye: number; readonly point: number },
  profile: HorizonProfile | null,
): boolean {
  const skyline = profile ? horizonAt(profile, body.azDeg) : -90;
  const beyond = skyline > marches.point + FAR_MARGIN_DEG ? skyline : -90;
  return body.elDeg > Math.max(marches.eye, beyond);
}

/** Whether each body shows from where the eye stands. */
export interface EyeSight {
  readonly sunClear: boolean;
  readonly earthClear: boolean;
}
