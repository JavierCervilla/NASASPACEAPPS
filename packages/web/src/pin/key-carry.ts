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
 * Carries the pin with the keyboard (VENT-10, VENT-37), the alternative to
 * dragging: from the «Drop a pin» button or the pin itself, Enter lifts
 * it over the selected site (or the middle of the view), the arrow keys
 * move it in screen steps (with Shift, bigger ones), Enter drops it and
 * Escape sends it back. Each step is said in the polite live region. A
 * click on the button drops it at once, for a pointer.
 */
import type { LatLon } from '../lib/polar-projection';
import type { Carrier } from './carrier';
import type { CarrySession } from './carry-session';
import type { CarryView } from './carry-view';
import type { ClientPoint, Surfaces } from './surfaces';

export interface KeyCarryDeps {
  readonly carrier: Carrier;
  readonly surfaces: Surfaces;
  /** The selected site's point, where the carry starts if it shows. */
  readonly startPoint: () => LatLon | null;
  /** Says `view` in the live region; `pickedUp` the first time. */
  readonly say: (view: CarryView, pickedUp: boolean) => void;
}

/** Where the keyboard's carry starts: the selected site, or mid view. */
function startAt(deps: KeyCarryDeps): ClientPoint | null {
  const surface = deps.surfaces.shown();
  if (!surface) return null;
  const point = deps.startPoint();
  const placed = point ? surface.place(point) : null;
  if (placed) return placed;
  const box = surface.host.getBoundingClientRect();
  return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
}

const ENDS = new Set(['Enter', ' ', 'Escape', 'Tab']);

/** The window's keys drive `session` until it ends. */
function bindKeys(session: CarrySession, deps: KeyCarryDeps): void {
  const key = (event: KeyboardEvent): void => {
    const moved = session.nudge(event.key, event.shiftKey);
    const now = deps.carrier.view.get();
    if (moved && now) deps.say(now, false);
    if (!moved && !ENDS.has(event.key)) return;
    if (event.key !== 'Tab') {
      event.preventDefault();
      event.stopPropagation();
    }
    if (moved) return;
    window.removeEventListener('keydown', key, true);
    if (event.key === 'Enter' || event.key === ' ') {
      session.release(event.timeStamp);
    } else {
      session.cancel(true);
    }
  };
  window.addEventListener('keydown', key, true);
}

/**
 * Lifts the pin for the keyboard, springing back to `home` (where it
 * starts, if not given) when cancelled; false when there is no view to
 * carry it over.
 */
export function carryByKeys(
  deps: KeyCarryDeps,
  home?: ClientPoint,
): boolean {
  const at = startAt(deps);
  if (!at) return false;
  const t = performance.now();
  const session = deps.carrier.lift({
    mode: 'keys', pointer: at, at, home: home ?? at, touch: false, t,
  });
  if (!session) return false;
  const first = deps.carrier.view.get();
  if (first) deps.say(first, true);
  bindKeys(session, deps);
  return true;
}

/**
 * Drops the pin at once on the selected site's point, or on the Moon's
 * point mid view: a point, not a place on screen, so a panel over the
 * view (the phone's open sheet) does not stand in the way.
 */
export function dropAtStart(deps: KeyCarryDeps): void {
  const surface = deps.surfaces.shown();
  const box = surface?.host.getBoundingClientRect();
  const mid = box && surface
    ? surface.pointAt(box.left + box.width / 2, box.top + box.height / 2)
    : null;
  const point = deps.startPoint() ?? mid;
  if (point) deps.carrier.place(point);
}
