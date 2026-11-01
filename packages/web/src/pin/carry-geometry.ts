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
 * The carried pin's geometry (VENT-10, VENT-37), pure: its centre (the
 * point) follows the pointer 1:1 from where it was grabbed (apple-design
 * §2); under a finger it rides above it, so the point stays in sight; and
 * the keyboard moves it in screen steps, so the arrows go where they
 * point on the globe and on the polar map alike.
 */
import type { ClientPoint } from './surfaces';

/** How far above a fingertip the pin's centre stays, px. */
export const TOUCH_LIFT_PX = 64;
/** Travel under which a press is a tap, not a drag, px (§10). */
export const TAP_SLOP_PX = 8;
/** Keyboard steps, px: plain and with Shift. */
const KEY_STEP_PX = { small: 6, big: 36 };

const ARROWS: Readonly<Record<string, ClientPoint>> = {
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
};

/**
 * The pin's offset from the pointer: where it was grabbed, but for a
 * finger never less than {@link TOUCH_LIFT_PX} above it.
 */
export function grabOffset(
  pointer: ClientPoint,
  at: ClientPoint,
  touch: boolean,
): ClientPoint {
  const x = at.x - pointer.x;
  const y = at.y - pointer.y;
  return touch ? { x, y: Math.min(y, -TOUCH_LIFT_PX) } : { x, y };
}

/**
 * The offset of a pin lifted by a finger held at `from`, now at `to`:
 * none (null) while the finger has not travelled, so a hold let go in
 * place drops the point pressed; then {@link TOUCH_LIFT_PX} above it.
 */
export function heldOffset(
  from: ClientPoint,
  to: ClientPoint,
): ClientPoint | null {
  return isTap(from, to) ? null : grabOffset(from, from, true);
}

/** The pin's centre after an arrow `key`; null for any other key. */
export function nudged(
  at: ClientPoint,
  key: string,
  big: boolean,
): ClientPoint | null {
  const arrow = ARROWS[key];
  if (!arrow) return null;
  const step = big ? KEY_STEP_PX.big : KEY_STEP_PX.small;
  return { x: at.x + arrow.x * step, y: at.y + arrow.y * step };
}

/** Whether a press that went from `a` to `b` stayed a tap. */
export const isTap = (a: ClientPoint, b: ClientPoint): boolean =>
  Math.hypot(b.x - a.x, b.y - a.y) < TAP_SLOP_PX;
