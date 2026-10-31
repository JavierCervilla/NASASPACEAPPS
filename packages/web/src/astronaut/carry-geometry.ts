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
 * The carried astronaut's geometry (VENT-10), pure: its feet follow the
 * pointer 1:1 from where it was grabbed (apple-design §2); under a finger
 * they ride above it, so the drop point stays in sight; it leans with the
 * pointer's speed; and the keyboard moves the feet in screen steps, so
 * the arrows go where they point on the globe and on the polar map alike.
 */
import type { ClientPoint } from './surfaces';

/** How far above a fingertip the feet stay, px. */
export const TOUCH_LIFT_PX = 64;
/** Travel under which a press is a tap, not a drag, px (§10). */
export const TAP_SLOP_PX = 8;
/** The lean's limit, degrees, and the speed that reaches it, px/s. */
const MAX_LEAN_DEG = 12;
const FULL_LEAN_SPEED = 900;
/** Keyboard steps, px: plain and with Shift. */
const KEY_STEP_PX = { small: 6, big: 36 };

const ARROWS: Readonly<Record<string, ClientPoint>> = {
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
};

/**
 * The feet's offset from the pointer: where it was grabbed, but for a
 * finger never less than {@link TOUCH_LIFT_PX} above it.
 */
export function grabOffset(
  pointer: ClientPoint,
  feet: ClientPoint,
  touch: boolean,
): ClientPoint {
  const x = feet.x - pointer.x;
  const y = feet.y - pointer.y;
  return touch ? { x, y: Math.min(y, -TOUCH_LIFT_PX) } : { x, y };
}

/** The figure's lean for a horizontal speed `vx` px/s, degrees. */
export function leanFor(vx: number, reducedMotion: boolean): number {
  if (reducedMotion) return 0;
  const share = Math.max(-1, Math.min(1, vx / FULL_LEAN_SPEED));
  return share * MAX_LEAN_DEG;
}

/** The feet after an arrow `key`; null for any other key. */
export function nudged(
  feet: ClientPoint,
  key: string,
  big: boolean,
): ClientPoint | null {
  const arrow = ARROWS[key];
  if (!arrow) return null;
  const step = big ? KEY_STEP_PX.big : KEY_STEP_PX.small;
  return { x: feet.x + arrow.x * step, y: feet.y + arrow.y * step };
}

/** Whether a press that went from `a` to `b` stayed a tap. */
export const isTap = (a: ClientPoint, b: ClientPoint): boolean =>
  Math.hypot(b.x - a.x, b.y - a.y) < TAP_SLOP_PX;
