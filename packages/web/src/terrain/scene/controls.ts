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
 * How the on-foot view is turned (VENT-34): a drag with Pointer Events
 * and capture (the world follows the pointer, mouse, pen or one finger),
 * and the arrows and Home on the focused view (look-input.ts). A key the
 * view does not use is left to the page.
 */
import { dragLook, keyLook } from '../look-input';
import type { CameraMode, Look } from '../view-camera';

export interface LookTarget {
  readonly mode: () => CameraMode;
  readonly look: () => Look;
  readonly home: () => Look;
  readonly set: (look: Look) => void;
  /** Degrees per px of drag: the field of view over the height. */
  readonly degPerPx: () => number;
}

type Handlers = readonly (readonly [string, EventListener])[];

/** The drag's handlers on `el`, one pointer at a time. */
function dragHandlers(el: HTMLElement, target: LookTarget): Handlers {
  let last: { x: number; y: number; id: number } | null = null;
  const down = (e: PointerEvent): void => {
    if (e.button !== 0) return;
    el.setPointerCapture(e.pointerId);
    last = { x: e.clientX, y: e.clientY, id: e.pointerId };
  };
  const move = (e: PointerEvent): void => {
    if (!last || e.pointerId !== last.id) return;
    const delta = [e.clientX - last.x, e.clientY - last.y] as const;
    last = { ...last, x: e.clientX, y: e.clientY };
    const { mode, look, degPerPx } = target;
    target.set(dragLook(mode(), look(), delta, degPerPx()));
  };
  const up = (e: PointerEvent): void => {
    if (last?.id === e.pointerId) last = null;
  };
  const as = (fn: (e: PointerEvent) => void) => fn as EventListener;
  return [['pointerdown', as(down)], ['pointermove', as(move)],
    ['pointerup', as(up)], ['pointercancel', as(up)]];
}

/** Binds drag and keys on `el`; returns the unbind. */
export function bindLook(el: HTMLElement, target: LookTarget): () => void {
  const key = (e: KeyboardEvent): void => {
    const next = keyLook(target.mode(), target.look(), e, target.home());
    if (!next) return;
    e.preventDefault();
    target.set(next);
  };
  const pairs: Handlers = [...dragHandlers(el, target),
    ['keydown', key as EventListener]];
  for (const [type, fn] of pairs) el.addEventListener(type, fn);
  return () => {
    for (const [type, fn] of pairs) el.removeEventListener(type, fn);
  };
}
