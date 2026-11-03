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
 * The on-foot scene's side of its host element (VENT-34): the drag and keys
 * that turn the look, the swipe's release that carries it on, and the
 * host's size, each noted in the crash report (VENT-49) as the person's
 * doing: a turn, a coast starting.
 */
import { coastOf } from '../look-coast';
import { dragScale } from '../look-input';
import type { Look } from '../view-camera';
import { bindLook } from './controls';
import type { ViewState } from './scene-frame';
import type { World } from './world';

/** Whether the person asked for less motion. */
export const reducedMotion = (): boolean =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** What a swipe's release does: carry the look on, if it was fast. */
function flingOf(host: HTMLElement, world: World, view: ViewState) {
  return (vx: number, vy: number): void => {
    const { fov } = world.stage.camera;
    const scale = dragScale(host.clientWidth, host.clientHeight, fov);
    view.coast = coastOf({ x: vx, y: vy }, scale, reducedMotion());
    if (!view.coast) return;
    world.setup.report.step('coast starting');
    world.invalidate();
  };
}

/** Binds the controls and the host's size; returns the unbind. */
export function bindHost(host: HTMLElement, world: World, view: ViewState,
  set: (look: Look) => void): () => void {
  const { camera } = world.stage;
  const unbind = bindLook(host, {
    set: (look) => {
      world.setup.report.step('turn', 'turn');
      set(look);
    },
    look: () => view.look, home: () => view.home,
    scale: () => dragScale(host.clientWidth, host.clientHeight, camera.fov),
    fling: flingOf(host, world, view),
    halt: () => void (view.coast = null) });
  const observer = new ResizeObserver(() => set(view.look));
  observer.observe(host);
  return () => {
    unbind();
    observer.disconnect();
  };
}
