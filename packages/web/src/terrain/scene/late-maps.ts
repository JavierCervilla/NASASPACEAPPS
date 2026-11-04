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
 * Surface maps that land after the first frame gave up on them (VENT-72):
 * `loadSurfaces` attaches them but draws nothing, so the ground would stay
 * without its photographed regolith and the Earth without its texture until
 * something else drew. While they are pending the host says it is working;
 * when they land the program they change is compiled off the frame, then one
 * frame is asked. A scene freed or replaced meanwhile is left alone.
 */
import type { World } from './world';

/** Compiles what the scene draws with now; a failure only costs a stall. */
async function compileNow(world: World): Promise<void> {
  const { renderer, scene, camera } = world.stage;
  try {
    await renderer.compileAsync(scene, camera);
  } catch {
    // The frame compiles it instead.
  }
}

/**
 * Follows `surfaces` (a `loadSurfaces` already running) until it settles:
 * marks the world pending now, and asks one frame once the maps are on.
 * `live` says the scene still stands.
 */
export function drawWhenLate(
  world: World,
  host: HTMLElement,
  surfaces: Promise<boolean>,
  live: () => boolean,
): void {
  world.mapsPending = true;
  host.dataset['working'] = 'true';
  void surfaces.then(async (attached) => {
    if (live() && attached) await compileNow(world);
    world.mapsPending = false;
    if (live()) world.invalidate();
  });
}
