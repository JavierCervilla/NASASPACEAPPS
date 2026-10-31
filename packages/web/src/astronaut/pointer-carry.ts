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
 * Carries the astronaut with a pointer (VENT-10): pressed on its figure
 * (in the dock or standing on the Moon), the pointer is captured, so the
 * drag goes on wherever it moves (apple-design §2); letting go drops it or
 * walks it back, Escape or a cancelled pointer walks it back, and a press
 * that does not travel is a tap.
 */
import { listenerSet } from '../lib/listener-set';
import type { Carrier } from './carrier';
import type { CarrySession } from './carry-session';
import { isTap } from './carry-geometry';
import type { ClientPoint } from './surfaces';

export interface PointerCarry {
  /** The figure's feet when pressed. */
  readonly feet: ClientPoint;
  /** A press that did not travel. */
  readonly onTap: () => void;
}

const at = (event: PointerEvent): ClientPoint => ({
  x: event.clientX,
  y: event.clientY,
});

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
    const up = at(e as PointerEvent);
    if (!isTap(down, up)) return session.release(e.timeStamp);
    session.cancel(false);
    onTap();
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
    feet: options.feet,
    touch: event.pointerType === 'touch',
    t: event.timeStamp,
  });
  if (!session) return;
  el.setPointerCapture(event.pointerId);
  bindCarry(session, el, pointer, options.onTap);
}
