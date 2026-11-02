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
 * How a drag and the keys turn the on-foot view (VENT-34): a drag moves
 * the world under the pointer, one field-of-view per viewport height; the
 * arrows turn 5° (Shift: 15°) and tilt 3°, and Home goes back to where
 * the view opened. Pure.
 */
import { turnLook, type CameraMode, type Look } from './view-camera';

const YAW_STEP = 5;
const YAW_STEP_BIG = 15;
const PITCH_STEP = 3;

/** `look` after a drag of `dx`, `dy` px over a view `fovDeg` x `heightPx`. */
export function dragLook(
  mode: CameraMode,
  look: Look,
  [dx, dy]: readonly [number, number],
  degPerPx: number,
): Look {
  return turnLook(mode, look, -dx * degPerPx, dy * degPerPx);
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

/**
 * `look` after `press`, `home` for Home; null when the key is not the
 * view's, so the page keeps it.
 */
export function keyLook(
  mode: CameraMode,
  look: Look,
  press: KeyPress,
  home: Look,
): Look | null {
  if (press.key === 'Home') return home;
  const arrow = ARROWS[press.key];
  if (!arrow) return null;
  const yaw = press.shiftKey ? YAW_STEP_BIG : YAW_STEP;
  return turnLook(mode, look, arrow[0] * yaw, arrow[1] * PITCH_STEP);
}
