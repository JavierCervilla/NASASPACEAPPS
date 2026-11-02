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
 * What hides a body from the point (VENT-34): along its azimuth, the
 * tile's highest elevation angle from the eye names a ridge with its
 * height and distance; when the profile hides the body and the tile does
 * not, the terrain beyond the tile does. Pure.
 */
import { horizonAt, type HorizonProfile } from '@ventana/sim';
import type { HeightTile } from './tile';
import { surfaceHeight } from './tile-mesh';
import { EYE_M, direction } from './view-camera';
import { dipDeg } from './far-horizon';

export interface Ridge {
  /** Elevation angle from the eye, degrees. */
  readonly elDeg: number;
  readonly distanceM: number;
  /** Over the point's ground, metres. */
  readonly heightM: number;
}

/** The tile's ridge along `azDeg`: its highest angle from the eye. */
export function ridgeAlong(
  tile: HeightTile,
  ys: Float32Array,
  azDeg: number,
): Ridge {
  const ground = surfaceHeight(tile, ys, 0, 0);
  const [dx, , dz] = direction(azDeg, 0);
  const step = tile.sizeM / (tile.n - 1) / 2;
  let best: Ridge = { elDeg: -90, distanceM: 0, heightM: 0 };
  for (let d = step; d <= tile.sizeM / 2; d += step) {
    const y = surfaceHeight(tile, ys, dx * d, -dz * d);
    const elDeg = (Math.atan2(y - ground - EYE_M, d) * 180) / Math.PI;
    if (elDeg > best.elDeg) best = { elDeg, distanceM: d, heightM: y - ground };
  }
  return best;
}

export type Blocker =
  | { readonly kind: 'clear' }
  | ({ readonly kind: 'ridge' } & Ridge)
  /** Hidden by terrain beyond the tile's reach. */
  | { readonly kind: 'far' };

export interface BodyDir {
  readonly azDeg: number;
  readonly elDeg: number;
}

/**
 * What hides `body`: the profile decides whether it is hidden (the smooth
 * sphere without one); the tile, whether a ridge in reach does it.
 */
export function blockerOf(
  body: BodyDir,
  ridge: Ridge,
  profile: HorizonProfile | null,
): Blocker {
  const horizon = profile ? horizonAt(profile, body.azDeg) : dipDeg(EYE_M);
  const skyline = Math.max(horizon, ridge.elDeg);
  if (body.elDeg > skyline) return { kind: 'clear' };
  if (ridge.elDeg >= body.elDeg && ridge.heightM > 0) {
    return { kind: 'ridge', ...ridge };
  }
  return { kind: 'far' };
}
