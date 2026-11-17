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
 * The pace of the walk marker's hover (VENT-128): a fine pointer sends more
 * moves than the display draws frames, and each pick marches the camera's
 * ray up to 20 km. The moves are gathered into one pick per animation
 * frame, the latest; a pointer within a fifth of a pixel of the last pick
 * under the same camera picks nothing, and a pick that lands where the ring
 * already is (the sky again, most often) asks for no frame. The ring stays
 * exact: whatever is picked is shown as picked.
 */
import type { EastNorth } from '../walk/walk-reach';

/** A fine pointer over the view, client px; null: it left. */
export type Pointer = { readonly x: number; readonly y: number } | null;

/**
 * A move of this or less, CSS px, is not picked again: under a device
 * pixel on screens up to 4x, so the ring would not visibly move.
 */
export const STILL_PX = 0.2;

export interface HoverDeps {
  readonly raf: (fn: () => void) => number;
  readonly cancel: (id: number) => void;
  /** The camera's pose as a key: a turn or a glide changes it. */
  readonly pose: () => string;
  /** The ground under a client point; null: the sky. */
  readonly pick: (x: number, y: number) => EastNorth | null;
  /** Shows the ring at `at` (null hides it) and asks for a frame. */
  readonly show: (at: EastNorth | null) => void;
}

export interface Hover {
  readonly hover: (at: Pointer) => void;
  /** Drops a pick still waiting for its frame. */
  readonly dispose: () => void;
}

/** A pointer or a place as a pair; null: none. */
type Pair = readonly [number, number] | null;

/** Whether `a` and `b` are both none, or within `tol` on each axis. */
const within = (a: Pair, b: Pair, tol: number): boolean =>
  (a === null || b === null ? a === b
    : Math.abs(a[0] - b[0]) <= tol && Math.abs(a[1] - b[1]) <= tol);

interface HoverState {
  next: Pointer;
  pointer: Pair;
  pose: string;
  shown: EastNorth | null;
}

/** One frame's pick of `state.next`, shown only if the ring changes. */
function pickNext(deps: HoverDeps, state: HoverState): void {
  const { next } = state;
  const pose = next ? deps.pose() : state.pose;
  const pointer: Pair = next ? [next.x, next.y] : null;
  if (within(pointer, state.pointer, STILL_PX) && pose === state.pose) return;
  Object.assign(state, { pointer, pose });
  const at = next ? deps.pick(next.x, next.y) : null;
  if (within(at, state.shown, 0)) return;
  state.shown = at;
  deps.show(at);
}

/** The hover of `deps`: at most one pick and one frame per display frame. */
export function createHover(deps: HoverDeps): Hover {
  let pending: number | null = null;
  const state: HoverState = { next: null, pointer: null, pose: '',
    shown: null };
  return {
    hover: (at) => {
      state.next = at;
      pending ??= deps.raf(() => {
        pending = null;
        pickNext(deps, state);
      });
    },
    dispose: () => {
      if (pending !== null) deps.cancel(pending);
      pending = null;
    },
  };
}
