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
 * What the on-foot scene loads once it stands (VENT-34): the astronaut, the
 * lander and the ground's maps, the host marked when all are in. The
 * `?onfoot=` switches (leave-out.ts) can leave the astronaut or the lander
 * out, and the host says which parts are left out and the tier it draws at
 * (`data-onfoot`, `data-tier`), for the tests and for a remote console.
 */
import type { Loop } from '../../globe/loop';
import { loadAstronaut } from './astronaut';
import { loadLander } from './lander';
import { markReadyWhenStanding } from './ready-mark';
import type { SceneSetup } from './scene-types';
import { loadSurfaces } from './surfaces';
import type { World } from './world';

/** Writes the tier and the parts left out on the host. */
export function markSetup(host: HTMLElement, setup: SceneSetup): void {
  host.dataset['tier'] = setup.quality.tier;
  if (setup.leave.size > 0) host.dataset['onfoot'] = [...setup.leave].join();
  else delete host.dataset['onfoot'];
}

/** Loads the astronaut and the maps; marks the host once both stand. */
export function startLoading(host: HTMLElement, world: World, loop: Loop,
  reducedMotion: () => boolean): () => void {
  let alive = true;
  const { leave } = world.setup;
  const lander = { into: world.lander, mask: world.mask,
    alive: () => alive };
  const astronaut = { into: world.astronaut, mask: world.mask,
    alive: () => alive, reducedMotion };
  const standing = Promise.all([
    leave.has('astronaut') ? undefined
      : loadAstronaut(astronaut, console.warn).then((idle) => {
        world.idle = idle;
      }),
    leave.has('lander') ? undefined
      : loadLander(lander, world.input?.lander ?? 'generic', console.warn),
    loadSurfaces(world, console.warn),
  ]).then(() => undefined);
  const unmark = markReadyWhenStanding(host, standing,
    () => loop.invalidate());
  return () => {
    alive = false;
    unmark();
  };
}
