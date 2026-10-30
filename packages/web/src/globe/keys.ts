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
 * Keyboard control of the globe: arrow keys rotate, plus and minus zoom.
 * `keyToMove` is pure; `bindKeys` and `bindWheel` attach it to an element.
 */
import type { PoseDelta } from './orbit';

/** Degrees per arrow-key press. */
const KEY_STEP_DEG = 10;
/** Zoom steps per plus or minus press. */
const KEY_ZOOM_STEPS = 2;
/** Wheel pixels per zoom step (a mouse notch is about 100 px). */
const WHEEL_PX_PER_STEP = 50;

const MOVES: Readonly<Record<string, Omit<PoseDelta, 'distance'>>> = {
  ArrowLeft: { latDeg: 0, lonEastDeg: -KEY_STEP_DEG },
  ArrowRight: { latDeg: 0, lonEastDeg: KEY_STEP_DEG },
  ArrowUp: { latDeg: KEY_STEP_DEG, lonEastDeg: 0 },
  ArrowDown: { latDeg: -KEY_STEP_DEG, lonEastDeg: 0 },
};

const ZOOMS: Readonly<Record<string, number>> = {
  '+': -KEY_ZOOM_STEPS,
  '=': -KEY_ZOOM_STEPS,
  '-': KEY_ZOOM_STEPS,
};

/**
 * What a key does: a rotation of the view (arrows: the view turns toward the
 * arrow), a zoom in steps (positive zooms out), or null for any other key.
 */
export function keyToMove(
  key: string,
): { rotate: Omit<PoseDelta, 'distance'> } | { zoom: number } | null {
  const rotate = MOVES[key];
  if (rotate) return { rotate };
  const zoom = ZOOMS[key];
  return zoom === undefined ? null : { zoom };
}

/** What the globe does with keyboard and wheel input. */
export interface KeyTarget {
  rotate(delta: Omit<PoseDelta, 'distance'>): void;
  zoom(steps: number): void;
}

/** Listens for keys on `el` (focused); returns the unbind function. */
export function bindKeys(el: HTMLElement, target: KeyTarget): () => void {
  const onKey = (event: KeyboardEvent): void => {
    const move = keyToMove(event.key);
    if (!move || event.altKey || event.ctrlKey || event.metaKey) return;
    event.preventDefault();
    if ('rotate' in move) target.rotate(move.rotate);
    else target.zoom(move.zoom);
  };
  el.addEventListener('keydown', onKey);
  return () => el.removeEventListener('keydown', onKey);
}

/** Wheel and trackpad pinch (a ctrl+wheel) zoom; returns the unbind. */
export function bindWheel(el: HTMLElement, target: KeyTarget): () => void {
  const onWheel = (event: WheelEvent): void => {
    event.preventDefault();
    const px = event.deltaMode === 0 ? event.deltaY : event.deltaY * 40;
    target.zoom(px / WHEEL_PX_PER_STEP);
  };
  el.addEventListener('wheel', onWheel, { passive: false });
  return () => el.removeEventListener('wheel', onWheel);
}
