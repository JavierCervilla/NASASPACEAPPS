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
 * The Sun and the Earth as the eye sees them where it stands (VENT-121):
 * the relief it marches over (the near ground inside its 4 km, the rings'
 * heights beyond, walk/eye-sight.ts), whether each body shows, and the
 * Sun's mask that follows: the near ground's own mask at the eye's node,
 * and the far factor off when terrain beyond the near ground hides the
 * Sun. At the point nothing changes: the profile decides (sky-place.ts).
 */
import { surfaceY } from '../ring/ring-local';
import { nearestSample } from '../tile-sample';
import type { HeightAt } from '../walk/ground-pick';
import { clearFromEye, marchElevation, type EyeSight }
  from '../walk/eye-sight';
import { isAway, type EastNorth } from '../walk/walk-reach';
import type { SceneInput } from './scene-types';
import type { World } from './world';

/** The heights a ray or a sight line crosses, in the frame's y. */
export function reliefHeight(world: World, input: SceneInput): HeightAt {
  const near = input.tiles[0]?.tile;
  const half = near ? near.sizeM / 2 : 0;
  const { store, frame, tier } = input.ring;
  const reach = { from: 0, levels: tier.levels };
  return (east, north) =>
    Math.abs(east) <= half && Math.abs(north) <= half
      ? world.ground(east, north)
      : surfaceY(store, frame, reach, [east, north]);
}

/** Whether each body shows from `eye`, over the relief and the profile. */
export function sightOf(
  world: World,
  input: SceneInput,
  eye: EastNorth,
): EyeSight {
  const heightAt = reliefHeight(world, input);
  const from = { at: eye, groundY: world.ground(eye[0], eye[1]) };
  const point = { at: [0, 0] as EastNorth, groundY: world.ground(0, 0) };
  const clear = (azDeg: number, elDeg: number): boolean =>
    clearFromEye({ azDeg, elDeg }, {
      eye: marchElevation(heightAt, from, azDeg),
      point: marchElevation(heightAt, point, azDeg),
    }, input.profile);
  const { sky } = input;
  return { sunClear: clear(sky.sunAz, sky.sunEl),
    earthClear: clear(sky.earthAz, sky.earthEl) };
}

/**
 * The Sun's mask where the eye stands: the near ground's mask at its node;
 * the far factor 0 when the eye's ground is lit there and the Sun still
 * does not show, which is terrain beyond the near ground.
 */
function maskAtEye(world: World, input: SceneInput, sight: EyeSight): void {
  const placed = input.tiles[0];
  const [east, north] = world.eye;
  const node = placed ? nearestSample(placed.tile, east, north) : 0;
  const centre = world.nearLit?.[node] ?? 1;
  world.mask.far.value = !sight.sunClear && centre > 0.5 ? 0 : 1;
  world.mask.near.value = world.mask.far.value * centre;
}

/**
 * Reads the sky from where the eye stands, when it is away from the point,
 * sets the Sun's mask for it, and tells the panel; true when away.
 */
export function applySight(world: World, input: SceneInput): boolean {
  world.sight = isAway(world.eye) ? sightOf(world, input, world.eye) : null;
  if (world.sight) maskAtEye(world, input, world.sight);
  world.tellEye();
  return world.sight !== null;
}
