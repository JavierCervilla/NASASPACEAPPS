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
 * What the on-foot view says and labels at an instant (VENT-34): for the
 * Sun and the Earth, their direction, whether they show over the terrain
 * and what hides them (ridge.ts); the rings' and the ridge's labels; and
 * where the view opens: toward the Sun when it is near the sky, else the
 * Earth. Pure.
 */
import { moonPosition, subLunarPoint,
  type HorizonProfile } from '@ventana/sim';
import { earthToBody } from './earth-orientation';
import type { I18n } from '../i18n/translate';
import { blockerOf, ridgeAlong } from './ridge';
import { RING_DISTANCES_M, type PlacedTile, type SceneWords,
  type SkyDirs } from './scene/scene-types';
import type { SeenBody } from './view-alt';
import { direction } from './view-camera';
import { ridgeLabel, ringLabel } from './view-text';
import { distanceText } from './walk/walk-words';

/** A body this far under the level still opens the view, degrees. */
const NEAR_SKY_DEG = -2;

/** The Sun and the Earth from the point, and what hides each. */
export function seenBodies(
  placed: PlacedTile,
  profile: HorizonProfile | null,
  sky: SkyDirs,
): SeenBody[] {
  const bodies = [
    { id: 'sun', azDeg: sky.sunAz, elDeg: sky.sunEl },
    { id: 'earth', azDeg: sky.earthAz, elDeg: sky.earthEl },
  ] as const;
  return bodies.map((body) => {
    const ridge = ridgeAlong(placed.tile, placed.ys, body.azDeg);
    const blocker = blockerOf(body, ridge, profile);
    return { ...body, visible: blocker.kind === 'clear', blocker };
  });
}

/** The labels drawn in the scene: rings, and the first hiding ridge. */
export function sceneWords(
  i18n: I18n,
  bodies: readonly SeenBody[],
): SceneWords {
  const rings = RING_DISTANCES_M.map((m) => ringLabel(i18n, m));
  const distance = (m: number): string => distanceText(i18n, m);
  const hider = bodies.find((b) => b.blocker.kind === 'ridge');
  if (hider?.blocker.kind !== 'ridge') return { rings, ridge: null, distance };
  const { blocker } = hider;
  return {
    rings,
    distance,
    ridge: { text: ridgeLabel(i18n, blocker), azDeg: hider.azDeg,
      distanceM: blocker.distanceM },
  };
}

/** Where the view opens: the Sun's azimuth when near the sky. */
export const startYaw = (sky: SkyDirs): number =>
  sky.sunEl > NEAR_SKY_DEG ? sky.sunAz : sky.earthAz;

/** The Earth's matrix to its body frame, as the site sees it at `atMs`. */
export const spinOf = (siteLatDeg: number, sky: SkyDirs, atMs: number) =>
  earthToBody({ toward: direction(sky.earthAz, sky.earthEl), siteLatDeg,
    subLunar: subLunarPoint(atMs), moonLonDeg: moonPosition(atMs).lonDeg });
