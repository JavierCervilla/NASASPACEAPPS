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
 * the canvas's context losses. The renders of one turn are one frame,
 * their counts summed: the split draw renders twice a frame (VENT-118).
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

/**
 * What `renderer` draws from now on, read after the render: three resets its
 * counts at each render, unless the dev tools turned that off to add them up.
 */
function countsSince(renderer: WebGLRenderer): () => Draw {
  const { info } = renderer;
  const was = info.autoReset === false
    ? { calls: info.render.calls, triangles: info.render.triangles }
    : { calls: 0, triangles: 0 };
  return () => ({ calls: info.render.calls - was.calls,
    triangles: info.render.triangles - was.triangles });
}

/** Calls `onDraw` after each of `renderer`'s renders; returns the undo. */
export function wrapRender(
  renderer: WebGLRenderer,
  onDraw: (draw: Draw) => void,
): () => void {
  const render = renderer.render;
  let frame: Draw | null = null;
  const close = () => {
    if (frame) onDraw(frame);
    frame = null;
  };
  renderer.render = (scene, camera) => {
    const counted = countsSince(renderer);
    render.call(renderer, scene, camera);
    // A lost context draws nothing: three returns at once.
    if (renderer.getContext().isContextLost()) return;
    const { calls, triangles } = counted();
    if (!frame) queueMicrotask(close);
    frame = { calls: (frame?.calls ?? 0) + calls,
      triangles: (frame?.triangles ?? 0) + triangles };
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
