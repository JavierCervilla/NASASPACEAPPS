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
 * How a drag and the keys turn the on-foot view (VENT-34): a drag turns
 * 180° across the view's width, so a full turn is two swipes on a phone and
 * on a desktop alike, and tilts one field of view over the view's height
 * (held to the pitch's range); the arrows turn 5° (Shift: 15°) and tilt 3°.
 * Home, like the compass, turns back to where the view opened on a spring
 * (look-home.ts), so the scene handles it (scene/controls.ts). A release
 * carries the finger's speed on (look-coast.ts). Pure.
 */
import { turnLook, type Look } from './view-camera';

const YAW_STEP = 5;
const YAW_STEP_BIG = 15;
const PITCH_STEP = 3;

/** Degrees a drag turns the view per px, on each axis. */
export interface DragScale {
  readonly yaw: number;
  readonly pitch: number;
}

/** A swipe across the whole width turns this far, degrees (the human's). */
export const SWIPE_DEG = 180;

/** The scale of a view `widthPx` x `heightPx` with `fovDeg` vertically. */
export function dragScale(
  widthPx: number,
  heightPx: number,
  fovDeg: number,
): DragScale {
  return { yaw: SWIPE_DEG / Math.max(widthPx, 1),
    pitch: fovDeg / Math.max(heightPx, 1) };
}

/** `look` after a drag of `dx`, `dy` px at `scale`. */
export function dragLook(
  look: Look,
  [dx, dy]: readonly [number, number],
  scale: DragScale,
): Look {
  return turnLook(look, -dx * scale.yaw, dy * scale.pitch);
}

/** The turn of each arrow: yaw and pitch, in steps. */
const ARROWS: Readonly<Record<string, readonly [number, number]>> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, 1],
  ArrowDown: [0, -1],
};

export interface KeyPress {
  readonly key: string;
  readonly shiftKey: boolean;
}

/** `look` after an arrow; null for any other key, which is not a turn. */
export function keyLook(look: Look, press: KeyPress): Look | null {
  const arrow = ARROWS[press.key];
  if (!arrow) return null;
  const yaw = press.shiftKey ? YAW_STEP_BIG : YAW_STEP;
  return turnLook(look, arrow[0] * yaw, arrow[1] * PITCH_STEP);
}
