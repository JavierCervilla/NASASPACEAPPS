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
 * Places the pin where the Moon is pressed (VENT-37): a click of the mouse
 * (or a pen) drops it on the point under it; a finger held still on the
 * Moon for {@link HOLD_MS} lifts it there, to drop in place or drag on
 * (carry-session.ts). A press that travels turns the globe as before, a
 * press on a site marker or a button is theirs, and a second finger is a
 * pinch. Once the pin is lifted, the finger's moves are marked handled
 * (`preventDefault`), so the globe under it stays still (drag.ts,
 * pinch.ts): the listeners here run first, in the capture phase.
 */
import type { Carrier } from './carrier';
import {
  forget,
  HOLD_MS,
  isControl,
  pointOf,
  travelled,
  type PressState,
} from './place-press';
import type { Surfaces } from './surfaces';

export { HOLD_MS, PLACE_SLOP_PX } from './place-press';

export interface PlaceDeps {
  readonly carrier: Carrier;
  readonly surfaces: Surfaces;
  /** Calls `fn` once after `ms`; returns how to call it off. */
  readonly after: (fn: () => void, ms: number) => () => void;
  /** Where Escape is heard (the window). */
  readonly keys: EventTarget;
}

/** The finger rested long enough: the pin is lifted under it. */
function hold(state: PressState, deps: PlaceDeps): void {
  const { press } = state;
  if (!press || !deps.surfaces.at(press.from)?.point) return;
  const pointer = press.from;
  const t = performance.now();
  const start = { mode: 'hold', pointer, at: pointer, touch: true, t } as const;
  state.held = deps.carrier.lift(start);
  state.press = null;
}

function down(state: PressState, deps: PlaceDeps, event: PointerEvent) {
  const { press } = state;
  // A second finger is a pinch: whatever the first one started stops.
  if (state.held || (press && press.id !== event.pointerId)) {
    return forget(state, true);
  }
  forget(state);
  const free = event.isPrimary && event.button === 0;
  if (!free || isControl(event.target) || deps.carrier.current()) return;
  const touch = event.pointerType === 'touch';
  state.press = { id: event.pointerId, from: pointOf(event), touch };
  if (touch) state.stopTimer = deps.after(() => hold(state, deps), HOLD_MS);
}

function move(state: PressState, event: PointerEvent): void {
  const { press, held } = state;
  if (held) {
    event.preventDefault();
    held.move(pointOf(event), event.timeStamp);
  } else if (press?.id === event.pointerId && travelled(press, event)) {
    forget(state);
  }
}

/** Let go: a held pin drops where it is, a click drops one under it. */
function up(state: PressState, deps: PlaceDeps, event: PointerEvent): void {
  const { press, held } = state;
  forget(state);
  if (held) {
    event.preventDefault();
    held.move(pointOf(event), event.timeStamp);
    held.release(event.timeStamp);
  } else if (press && !press.touch && press.id === event.pointerId) {
    const point = deps.surfaces.at(pointOf(event))?.point;
    if (point) deps.carrier.place(point);
  }
}

/** Places the pin from presses on `host`; returns the unbind. */
export function bindPlacing(host: HTMLElement, deps: PlaceDeps): () => void {
  const state: PressState = {
    press: null, held: null, stopTimer: () => undefined,
  };
  const as = (fn: (e: PointerEvent) => void) => (e: Event) =>
    fn(e as PointerEvent);
  const listeners: [EventTarget, string, (e: Event) => void][] = [
    [host, 'pointerdown', as((e) => down(state, deps, e))],
    [host, 'pointermove', as((e) => move(state, e))],
    [host, 'pointerup', as((e) => up(state, deps, e))],
    [host, 'pointercancel', () => forget(state, true)],
    [host, 'contextmenu', (e) => {
      if (state.press?.touch || state.held) e.preventDefault();
    }],
    [deps.keys, 'keydown', (e) => {
      if ((e as KeyboardEvent).key === 'Escape') forget(state, true);
    }],
  ];
  const capture = { capture: true };
  listeners.forEach(([on, type, fn]) => on.addEventListener(type, fn, capture));
  return () => listeners.forEach(([on, type, fn]) =>
    on.removeEventListener(type, fn, capture));
}
