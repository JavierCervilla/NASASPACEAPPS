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
 * Carries the pin with a pointer (VENT-10, VENT-37): pressed on the pin
 * standing on the Moon, the pointer is captured, so the drag goes on
 * wherever it moves (apple-design §2); letting go drops it or springs it
 * back, Escape or a cancelled pointer springs it back, and a press that
 * does not travel is a tap.
 */
import { listenerSet } from '../lib/listener-set';
import type { Carrier } from './carrier';
import type { CarrySession } from './carry-session';
import { isTap } from './carry-geometry';
import type { ClientPoint } from './surfaces';

export interface PointerCarry {
  /** The pin's centre when pressed. */
  readonly at: ClientPoint;
  /** A press that did not travel. */
  readonly onTap: () => void;
}

const at = (event: PointerEvent): ClientPoint => ({
  x: event.clientX,
  y: event.clientY,
});

/**
 * The button came up at `up`: a tap if it never travelled from `down`,
 * else a drop read where the pointer is now.
 */
function letGo(
  session: CarrySession,
  down: ClientPoint,
  up: PointerEvent,
  onTap: () => void,
): void {
  if (isTap(down, at(up))) {
    session.cancel(false);
    return onTap();
  }
  session.move(at(up), up.timeStamp);
  session.release(up.timeStamp);
}

/** Drives `session` from the pointer captured by `el` until it ends. */
function bindCarry(
  session: CarrySession,
  el: HTMLElement,
  down: ClientPoint,
  onTap: () => void,
): void {
  const { on, off } = listenerSet();
  const abandon = (): void => {
    off();
    session.cancel(true);
  };
  on(el, 'pointermove', (e) => session.move(at(e as PointerEvent), e.timeStamp));
  on(el, 'pointerup', (e) => {
    off();
    letGo(session, down, e as PointerEvent, onTap);
  });
  on(el, 'pointercancel', abandon);
  on(el, 'lostpointercapture', abandon);
  on(window, 'keydown', (e) => {
    if ((e as KeyboardEvent).key === 'Escape') abandon();
  });
}

/** Starts a carry from `event`, a press on `el`. */
export function carryFromPointer(
  event: PointerEvent,
  el: HTMLElement,
  carrier: Carrier,
  options: PointerCarry,
): void {
  if (event.button !== 0) return;
  const pointer = at(event);
  const session = carrier.lift({
    mode: 'pointer',
    pointer,
    at: options.at,
    touch: event.pointerType === 'touch',
    t: event.timeStamp,
  });
  if (!session) return;
  el.setPointerCapture(event.pointerId);
  bindCarry(session, el, pointer, options.onTap);
}
