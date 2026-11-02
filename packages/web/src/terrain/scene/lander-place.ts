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
 * Where the lander stands and which way it faces (VENT-46): on the
 * ground at its spot (props.ts), turned to look at the astronaut, its
 * footpads sunk a hair into the highest ground under them, so a slope
 * buries a pad rather than floating one.
 */
import type { Group } from 'three';
import { LANDER_RADIUS_M, type LanderKind } from '../lander-kind';
import type { GroundAt } from '../stones';
import { landerSpot } from './props';

/** How far the highest footpad's ground sits above the origin, metres. */
const SINK_M = 0.05;
const AROUND = 4;

/** The highest ground under a lander's footprint at `spot`. */
function highestUnder(
  ground: GroundAt,
  spot: readonly [number, number],
  radiusM: number,
): number {
  const around = Array.from({ length: AROUND }, (_, i) => {
    const angle = (i / AROUND) * 2 * Math.PI;
    return ground(spot[0] + Math.cos(angle) * radiusM,
      spot[1] + Math.sin(angle) * radiusM);
  });
  return Math.max(ground(spot[0], spot[1]), ...around);
}

/** Puts `holder` on the ground beside the astronaut. */
export function placeLander(
  holder: Group,
  ground: GroundAt,
  input: { readonly lander: LanderKind; readonly startYawDeg: number },
): void {
  const spot = landerSpot(input.startYawDeg);
  const y = highestUnder(ground, spot, LANDER_RADIUS_M[input.lander]);
  holder.position.set(spot[0], y - SINK_M, -spot[1]);
  holder.rotation.y = Math.atan2(-spot[0], spot[1]);
}
