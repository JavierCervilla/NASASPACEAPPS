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
 * Lighting the on-foot world for an instant (VENT-49): the sky placed, the
 * near ground's shadows and the rings' shading run again, and the exposure
 * set. It is done only when the Sun or the Earth moved enough to see
 * (relight.ts): the live clock makes a new instant every minute, and each
 * one lit every ring again while the GPU drew them. Each instant, lit or
 * skipped, is noted in the crash report.
 */
import { decideRelight } from '../relight';
import type { SceneInput } from './scene-types';
import { placeSky, shadeSun } from './sky-place';
import { exposureFor } from './stage';
import type { World } from './world';

/** Lights the world for `input`'s sky. */
function lightWorld(world: World, input: SceneInput): void {
  let ringGrid: { lit: Float32Array; sizeM: number } | null = null;
  placeSky(world.sky, input.sky, input.earthSpin);
  const onLit = (lit: Float32Array): void => {
    const grid = { lit, sizeM: input.tiles[0]?.tile.sizeM ?? 0 };
    world.rings?.setLit(0, grid);
    ringGrid = grid;
  };
  const sun = { azDeg: input.sky.sunAz, elDeg: input.sky.sunEl };
  shadeSun({ tiles: input.tiles, onLit, profile: input.profile,
    mask: world.mask }, input.sky);
  world.farShade?.run(sun);
  world.craters?.relight(input.sky, ringGrid);
  const reached = world.mask.near.value > 0;
  world.shared.fill.uSunHere.value = reached ? 1 : 0;
  world.stage.renderer.toneMappingExposure = exposureFor(reached);
}

/**
 * Lights the world for `input`'s sky when it moved enough since the last
 * lighting, or when `forced` (new ground has no light yet); true when it
 * did, which is when the view has to draw.
 */
export function relightWorld(
  world: World,
  input: SceneInput,
  forced: boolean,
): boolean {
  const verdict = decideRelight(world.lit, input.sky, forced);
  world.setup.report.step(verdict.text, verdict.repeat);
  if (!verdict.relight) return false;
  world.lit = input.sky;
  world.stage.shadow.mark();
  lightWorld(world, input);
  return true;
}
