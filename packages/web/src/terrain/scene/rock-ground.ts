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
 * The grounds the rocks use (VENT-124). Where they are scattered stays the
 * near grid's answer (rocks-measured.ts reads its slopes and rims, so the
 * same rocks come byte for byte); where each one stands is the surface
 * actually drawn there: the crater patch inside its disc on the high tier
 * (built on the near grid, the rings cut out under it), else ring level 0
 * at the tier's stride (ring/ring-drawn.ts). On the near grid alone the
 * medium tier's coarser mesh buried the near rocks.
 */
import { drawnGround, type GroundAt } from '../ring/ring-drawn';
import type { RingView } from '../ring/ring-session';
import type { CraterLayer } from './crater-layer';

export interface RockGrounds {
  /** What the scatter reads: slopes and rims. */
  readonly scatter: GroundAt;
  /** What each rock stands on. */
  readonly stand: GroundAt;
}

interface Near {
  /** The near grid (world-ground.ts). */
  readonly ground: GroundAt;
  readonly craters: CraterLayer | null;
  /** The crater patch's radius around the point, m; 0 without one. */
  readonly patchM: number;
}

/** The rocks' grounds over `ring` for `near`. */
export function rockGrounds(ring: RingView, near: Near): RockGrounds {
  const scatter = near.craters?.groundFor(near.ground) ?? near.ground;
  const rings = drawnGround(ring, ring.tier.strides[0] ?? 1, near.ground);
  const r = near.craters ? near.patchM : 0;
  const stand: GroundAt = r > 0
    ? (e, n) => (Math.hypot(e, n) < r ? scatter(e, n) : rings(e, n))
    : rings;
  return { scatter, stand };
}
