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
 * What the benchmark watches on an attached renderer (VENT-81): every
 * `render` call, wrapped so each drawn frame reports its draw calls and
 * triangles (`info.render` after the call: three resets it at each
 * render; a render on a lost context draws nothing and is not one), and
 * the canvas's context losses.
 */
import type { WebGLRenderer } from 'three';

export type RendererKind = 'globe' | 'onFoot';

/** A renderer as the hook hands it over (globe/dev-hook.ts). */
export interface RendererHandle {
  readonly renderer: WebGLRenderer;
  /** The globe's Moon maps, bytes. */
  readonly textureBytes?: () => number;
  readonly kind: RendererKind;
}

export interface Draw {
  readonly calls: number;
  readonly triangles: number;
}

/** Calls `onDraw` after each of `renderer`'s renders; returns the undo. */
export function wrapRender(
  renderer: WebGLRenderer,
  onDraw: (draw: Draw) => void,
): () => void {
  const render = renderer.render;
  renderer.render = (scene, camera) => {
    render.call(renderer, scene, camera);
    // A lost context draws nothing: three returns at once.
    if (renderer.getContext().isContextLost()) return;
    const { calls, triangles } = renderer.info.render;
    onDraw({ calls, triangles });
  };
  return () => {
    renderer.render = render;
  };
}

/** Calls `onLost` on each of `canvas`'s context losses; returns the undo. */
export function watchLoss(
  canvas: HTMLCanvasElement,
  onLost: () => void,
): () => void {
  canvas.addEventListener('webglcontextlost', onLost);
  return () => canvas.removeEventListener('webglcontextlost', onLost);
}

/** What the registry piles up between two drains. */
export interface Pile {
  draws: Draw[];
  lost: number;
  readonly attached: Set<RendererHandle>;
  /** Canvases whose next loss is the benchmark's own. */
  readonly deliberate: WeakSet<HTMLCanvasElement>;
}

/** Watches `handle` into `pile`; returns what stops it. */
export function watchHandle(handle: RendererHandle, pile: Pile): () => void {
  const canvas = handle.renderer.domElement;
  pile.attached.add(handle);
  const unwrap = wrapRender(handle.renderer, (d) => void pile.draws.push(d));
  const unwatch = watchLoss(canvas, () => {
    if (pile.deliberate.has(canvas)) pile.deliberate.delete(canvas);
    else pile.lost += 1;
  });
  return () => {
    unwrap();
    unwatch();
    pile.attached.delete(handle);
  };
}

/** Whether `handle`'s WebGL context is alive. */
export const contextAlive = (handle: RendererHandle): boolean =>
  !handle.renderer.getContext().isContextLost();
