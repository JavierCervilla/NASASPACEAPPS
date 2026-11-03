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
 * The relief rings in the world (VENT-46): a new ring replaces the one
 * drawn, whose meshes, queued jobs and shading go with it.
 */
import { createRingLayer } from './ring-layer';
import { createFarShade } from './ring-shade';
import type { SceneInput } from './scene-types';
import type { World } from './world';

/** Draws the relief rings of `input`, replacing those of another ring. */
export function applyRings(world: World, input: SceneInput): void {
  if (world.rings?.view === input.ring) return;
  world.rings?.dispose();
  world.slicer.clear();
  const { report } = world.setup;
  const rings = createRingLayer(input.ring, world.material, world.slicer,
    (text) => report.step(text));
  world.stage.scene.add(rings.group);
  world.rings = rings;
  world.farShade = world.setup.leave.has('shade') ? null
    : createFarShade(input.ring, world.slicer,
      (level, grid) => world.rings?.setLit(level, grid));
}

