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
 * Variant B (VENT-81): the hidden globe's WebGL context released while
 * the on-foot view is open, through `WEBGL_lose_context`, a switch of the
 * benchmark alone; the app does not change. The loss is the benchmark's,
 * so it is not counted as one (registry.ts), and the mark a loss leaves
 * for the start's blocked-WebGL check (lib/gl-marks.ts) is put back as
 * it was. The context stays lost until the next run's page load.
 */
import { GL_LOST_KEY } from '../lib/gl-marks';
import type { Registry } from './registry';

/** Puts `key` back to `before` in `storage`, null removing it. */
function restoreMark(storage: Storage, before: string | null): void {
  if (before === null) storage.removeItem(GL_LOST_KEY);
  else storage.setItem(GL_LOST_KEY, before);
}

/** Releases the globe's context; false when there was none to release. */
export function releaseGlobe(registry: Registry, storage: Storage): boolean {
  const globe = registry.handles().find((h) => h.kind === 'globe');
  const gl = globe?.renderer.getContext();
  const lose = gl?.getExtension('WEBGL_lose_context');
  if (!globe || !gl || !lose || gl.isContextLost()) return false;
  const canvas = globe.renderer.domElement;
  const before = storage.getItem(GL_LOST_KEY);
  registry.expectLoss(canvas);
  // Added after the app's own listener, so it runs after the mark is set.
  canvas.addEventListener('webglcontextlost',
    () => restoreMark(storage, before), { once: true });
  lose.loseContext();
  return true;
}
