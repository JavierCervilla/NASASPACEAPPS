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
 * What the on-foot scene loads once it stands (VENT-34): the ground's maps,
 * the host marked when they are in. The host also says which parts the
 * `?onfoot=` switches (leave-out.ts) leave out and the tier it draws at
 * (`data-onfoot`, `data-tier`), for the tests and for a remote console.
 */
import { markReadyWhenStanding } from './ready-mark';
import { watchHidden } from './page-hidden';
import { compileFirst, MAPS_GIVE_UP_MS, waitAtMost } from './scene-compile';
import { addWarmUp } from './scene-warm-up';
import type { SceneHooks, SceneSetup } from './scene-types';
import { loadSurfaces } from './surfaces';
import type { World } from './world';

/** Writes the tier and the parts left out on the host. */
export function markSetup(host: HTMLElement, setup: SceneSetup): void {
  host.dataset['tier'] = setup.quality.tier;
  if (setup.leave.size > 0) host.dataset['onfoot'] = [...setup.leave].join();
  else delete host.dataset['onfoot'];
}

/**
 * Loads the ground's maps, then compiles every program the scene will draw
 * with (VENT-69), noting both in the crash report.
 */
async function loadParts(world: World, hooks: SceneHooks): Promise<void> {
  const { report } = world.setup;
  const wait = (ms: number): Promise<void> =>
    new Promise((done) => window.setTimeout(done, ms));
  const watch = watchHidden(document);
  const maps = await waitAtMost(loadSurfaces(world, console.warn),
    MAPS_GIVE_UP_MS, wait);
  report.step(maps === 'done' ? 'all parts loaded'
    : 'surface maps late: drawing without them');
  const { renderer, scene, camera } = world.stage;
  const removeWarmUp = addWarmUp(scene, world);
  await compileFirst({
    compile: () => renderer.compileAsync(scene, camera),
    now: () => performance.now(), wait, note: (text) => report.step(text),
    hidden: watch.sawHidden, onSlow: hooks.onSlowFrame,
  });
  watch.stop();
  removeWarmUp();
}

/**
 * Loads the maps and compiles; marks the host and opens the loop's gate
 * once they stand, so the first frame draws with every program ready.
 */
export function startLoading(
  host: HTMLElement,
  world: World,
  loop: { readonly open: () => void },
  hooks: SceneHooks,
): () => void {
  return markReadyWhenStanding(host, loadParts(world, hooks),
    () => loop.open());
}
