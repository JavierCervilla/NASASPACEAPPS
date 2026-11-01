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
 * One press on a surface that may place the pin (VENT-37,
 * place-gesture.ts): where it started, whether a finger made it, and the
 * pin a held finger lifted, with how to forget it all. Pure but for the
 * session it cancels.
 */
import type { CarrySession } from './carry-session';
import type { ClientPoint } from './surfaces';

/** How long a finger rests on the Moon before it lifts a pin, ms. */
export const HOLD_MS = 450;
/** Travel past which a press turns the globe instead (drag.ts), px. */
export const PLACE_SLOP_PX = 4;

export interface Press {
  readonly id: number;
  readonly from: ClientPoint;
  readonly touch: boolean;
}

export interface PressState {
  press: Press | null;
  /** The pin a held finger lifted, while it carries it. */
  held: CarrySession | null;
  /** Calls off the hold's timer. */
  stopTimer: () => void;
}

export const pointOf = (event: PointerEvent): ClientPoint => ({
  x: event.clientX,
  y: event.clientY,
});

/** Whether a press on `target` belongs to a marker or a button. */
export const isControl = (target: EventTarget | null): boolean => {
  const el = target as Partial<Element> | null;
  return el?.closest?.('button, [data-site-id]') != null;
};

/** Whether `event` travelled past the slop from where `press` began. */
export const travelled = (press: Press, event: PointerEvent): boolean => {
  const to = pointOf(event);
  const { from } = press;
  return Math.hypot(to.x - from.x, to.y - from.y) > PLACE_SLOP_PX;
};

/** Forgets the press; a lifted pin springs back if `cancel`. */
export function forget(state: PressState, cancel = false): void {
  const { held } = state;
  state.stopTimer();
  state.stopTimer = () => undefined;
  state.press = null;
  state.held = null;
  if (cancel) held?.cancel(true);
}
