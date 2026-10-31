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
 * How the globe yields to the phone sheet. The canvas always covers the whole
 * screen; the Moon is framed in a band above the sheet at half (the CSS custom
 * property `--globe-frame-inset` sets how much of the host's bottom it leaves
 * out). The free band a framed site lands in ends at the sheet's top edge
 * (free-band.ts), and once the sheet drops below the frame (towards peek or
 * closed) the frame slides down to stay centred in the space the sheet frees:
 * with the sheet closed the Moon sits between the top bar and the tab bar, as
 * the validated canvas «Phone · sheet closed» shows. It slides, not grows, so
 * the zoom never changes under the finger.
 */
import type { PerspectiveCamera } from 'three';
import type { WatchedValue } from '../lib/watched-value';
import type { FreeBandWatch } from './free-band';
import { frameCamera, type StageFrame } from './stage';

/**
 * Px the frame (`height` px tall, from the top of a `screen` px tall
 * screen) moves down to sit centred above a sheet edge at `edge` px, which
 * rests below the screen when closed; 0 while the sheet covers the
 * frame's lower part.
 */
export function viewportShift(
  edge: number,
  height: number,
  screen: number,
): number {
  return Math.max(0, (Math.min(edge, screen) - height) / 2);
}

/** The host's size, the inset the frame leaves out, and the screen. */
export interface FrameSize {
  readonly width: number;
  readonly height: number;
  readonly inset: number;
  readonly screen: number;
}

/** Where the Moon is framed for a sheet edge at `edge` px (null: none). */
export function globeFrame(size: FrameSize, edge: number | null): StageFrame {
  const frameHeight = Math.max(1, size.height - size.inset);
  const top =
    edge === null ? 0 : viewportShift(edge, frameHeight, size.screen);
  return { width: size.width, height: size.height, frameHeight, top };
}

/** The px the frame leaves out at the host's bottom (0 on a desktop). */
export function frameInset(host: HTMLElement): number {
  const value = getComputedStyle(host).getPropertyValue('--globe-frame-inset');
  return Number.parseFloat(value) || 0;
}

export interface SheetEdgeParts {
  readonly camera: PerspectiveCamera;
  readonly band: Pick<FreeBandWatch, 'layout'>;
  readonly invalidate: () => void;
}

/**
 * Follows the sheet's edge and the host's size: frames the camera, then
 * hands the free band the sheet's top edge, in the host's coordinates.
 * Returns the unbind function.
 */
export function bindSheetEdge(
  host: HTMLElement,
  parts: SheetEdgeParts,
  edge: WatchedValue<number | null>,
): () => void {
  let inset = frameInset(host);
  const follow = (): void => {
    const top = edge.get();
    const { clientWidth: width, clientHeight: height } = host;
    const size = { width, height, inset, screen: window.innerHeight };
    frameCamera(parts.camera, globeFrame(size, top));
    const sheetTop = top ?? Number.POSITIVE_INFINITY;
    const hostTop = host.getBoundingClientRect().top;
    parts.band.layout({ sheetTop: sheetTop - hostTop });
    parts.invalidate();
  };
  const unwatch = watchSize(host, () => {
    inset = frameInset(host);
    follow();
  });
  follow();
  const unsubscribe = edge.subscribe(follow);
  return () => [unwatch, unsubscribe].forEach((unbind) => unbind());
}

/** Calls `onResize` whenever `host` changes size; returns the unbind. */
function watchSize(host: HTMLElement, onResize: () => void): () => void {
  const observer = new ResizeObserver(onResize);
  observer.observe(host);
  return () => observer.disconnect();
}
