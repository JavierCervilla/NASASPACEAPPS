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
 * What the on-foot scene tells the crash report about its stage and its
 * frames (VENT-49): that the stage stands and which GPU it runs on, and for
 * each frame drawn the renderer's own counts, the drawing buffer and what
 * the draw call cost. Read from the renderer; written to the report's sink.
 */
import { gpuName } from '../report/environment';
import type { World } from './world';

/** Notes that the stage stands, and the GPU's name when the driver gives it. */
export function reportStage(world: World): void {
  const { report } = world.setup;
  report.environment({ gpu: gpuName(world.stage.renderer.getContext()) });
  report.step('stage created');
}

/**
 * Notes the frame just drawn. `drawMs` is the draw call, and while the
 * frame probe times the load (frame-probe.ts) it includes the wait for the
 * GPU.
 */
export function reportFrame(world: World, drawMs: number): void {
  const { renderer } = world.stage;
  const { calls, triangles } = renderer.info.render;
  const { geometries, textures } = renderer.info.memory;
  const { width, height } = renderer.domElement;
  const { report } = world.setup;
  report.frame({ calls, triangles, drawMs, canvas: `${width}x${height}` });
  report.memory({ geometries, textures });
}
